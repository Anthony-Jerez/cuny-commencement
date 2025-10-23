import time, pathlib, re, asyncio, argparse, httpx
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "QC-CommencementScraper/1.0 (contact: you@example.com)"}
DATA_DIR = pathlib.Path("data")
DATA_DIR.mkdir(exist_ok=True)

DEFAULT_URLS = [
    "https://www.qc.cuny.edu/ce/for-graduates/",
    "https://www.qc.cuny.edu/ce/for-guests/",
    "https://www.qc.cuny.edu/a/directions/",
    "https://www.qc.cuny.edu/ce/faq/",
]

# Concurrency parameters
MAX_CONCURRENCY = 4
REQUEST_TIMEOUT = 25

def make_soup(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "html.parser")

def element_to_text(el, base_url: str) -> str:
    """Convert from HTML to markdown."""
    # Links -> [text](url)
    for a in el.find_all("a"):
        text = (a.get_text(" ", strip=True) or "").strip()
        href = a.get("href") or ""
        if href:
            href = urljoin(base_url, href)
            a.replace_with(f"[{text}]({href})")
        else:
            a.replace_with(text)

    # <li> -> "- item"
    for li in el.find_all("li"):
        txt = li.get_text(" ", strip=True)
        li.replace_with(f"- {txt}\n")

    # <br> -> newline
    for br in el.find_all("br"):
        br.replace_with("\n")

    # remove noise
    for tag in el.find_all(["script", "style", "noscript"]):
        tag.decompose()

    # keep headings and paragraphs as text separated by newlines
    text = el.get_text("\n", strip=True)
    # Normalize whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def page_title_from(soup, fallback: str) -> str:
    return soup.title.get_text(strip=True) if soup.title else fallback


def make_safe_stem(url: str) -> str:
    """
    Turn a URL path into a filesystem-safe stem. e.g., https://www.qc.cuny.edu/a/directions/ -> 'directions'
    """
    path = urlparse(url).path.rstrip("/")
    if not path or path == "/":
        stem = "index"
    else:
        stem = path.split("/")[-1]
    # for safety
    stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", stem).strip("-")
    return stem or "page"


def should_scrape_toggles(url: str) -> bool:
    """
    Produce the toggle-based .md for pages that use Divi toggles for primary content
    (graduates & guests).
    """
    u = url.rstrip("/")
    return ("/ce/for-graduates" in u) or ("/ce/for-guests" in u)


def should_scrape_text_inners(url: str) -> bool:
    """
    Generate -text-inner.md for pages where we want those blocks.
    We explicitly SKIP 'for-guests' as its not needed.
    """
    u = url.rstrip("/")
    return ("/ce/for-graduates" in u) or ("/a/directions" in u) or ("/ce/faq" in u)


def parse_divi_toggles(html: str, url: str):
    """
    Build a markdown document with sections from Divi toggle blocks.
    For /ce/for-guests/, first try the exact class structure requested, then fall back
    to a robust selector that matches all Divi toggle items, open or closed.
    """
    soup = make_soup(html)

    blocks = []
    if "/ce/for-guests" in url.rstrip("/"):
        # Try the EXACT class structure requested
        exact_selector = 'div[class="et_pb_module et_pb_toggle et_pb_toggle_0 et_pb_toggle_item et_pb_toggle_open"]'
        blocks = soup.select(exact_selector)
        # If nothing found (e.g., items are closed or class order differs), fall back to robust:
        if not blocks:
            blocks = soup.select("div.et_pb_module.et_pb_toggle.et_pb_toggle_item")
    else:
        # Graduates page (and any other future Divi-toggle pages): robust selector
        blocks = soup.select("div.et_pb_module.et_pb_toggle.et_pb_toggle_item")

    sections = []
    for i, tg in enumerate(blocks, 1):
        title_el = tg.select_one(".et_pb_toggle_title")
        body_el  = tg.select_one(".et_pb_toggle_content")
        title = (title_el.get_text(" ", strip=True) if title_el else f"Section {i}").strip()
        body = element_to_text(body_el or tg, url)
        if body:
            sections.append(f"## {title}\n\n{body}")

    # Fallback: if nothing matched, save main content so you can inspect
    if not sections:
        main = soup.find("main") or soup
        sections.append(element_to_text(main, url))

    md = f"# {page_title_from(soup, url)}\n\nSource: {url}\n\n" + "\n\n---\n\n".join(sections)
    return md, len(blocks)


def parse_text_inners(html: str, url: str):
    """
    Build a markdown doc with sections from all div[class="et_pb_text_inner"] blocks.
    Captures inner content like <h4>/<h5> + <p> (RSVP example, Directions & FAQ sections).
    """
    soup = make_soup(html)

    # EXACT class match (only elements whose class attribute is exactly "et_pb_text_inner")
    blocks = soup.select('div[class="et_pb_text_inner"]')

    sections = []
    for i, el in enumerate(blocks, 1):
        # Prefer a heading inside the block if present
        heading = el.find(["h1", "h2", "h3", "h4", "h5", "h6"])
        title = heading.get_text(" ", strip=True) if (heading and heading.get_text(strip=True)) else None

        # Fallback: peek for a nearby previous heading
        if not title:
            parent = el.find_parent(["section", "article", "div"]) or el
            prev_h = parent.find_previous(["h2", "h3", "h4", "h5", "h6"])
            if prev_h and prev_h.get_text(strip=True):
                title = prev_h.get_text(" ", strip=True)

        body = element_to_text(el, url)
        if body:
            sections.append(f"## {title or f'Text Block {i}'}\n\n{body}")

    # If nothing matched (site structure changed), save main content to help debug
    if not sections:
        main = soup.find("main") or soup
        sections.append(element_to_text(main, url))

    md = f"# {page_title_from(soup, url)}\n\nSource: {url}\n\n" + "\n\n---\n\n".join(sections)
    return md, len(blocks)


def save_markdown(md: str, filename: str) -> pathlib.Path:
    path = DATA_DIR / filename
    path.write_text(md, encoding="utf-8")
    return path


async def fetch_html_async(client: httpx.AsyncClient, url: str) -> str:
    t0 = time.perf_counter()
    print(f"[fetch start] {url}")
    resp = await client.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    html = resp.text
    # Log HTTP protocol
    proto = resp.extensions.get("http_version", b"HTTP/1.1")
    dt = (time.perf_counter() - t0) * 1000
    print(f"[fetch done ] {url}  ({dt:.0f} ms, {len(html):,} chars, {proto})")
    return html


async def scrape_one_async(client: httpx.AsyncClient, url: str):
    """Fetch + parse + save files for a single URL."""
    stem = make_safe_stem(url)
    try:
        html = await fetch_html_async(client, url)
        # A) text-inner blocks (only if configured for this URL)
        if should_scrape_text_inners(url):
            md_text, n_text = parse_text_inners(html, url)
            out_text = save_markdown(md_text, f"{stem}-text-inner.md")
            print(f"[text_inner] {url} -> {out_text.name}  blocks={n_text}  size={len(md_text)}")
        else:
            print(f"[text_inner] skipped {url}")
        # B) Divi toggles (graduates/guests)
        if should_scrape_toggles(url):
            md_tog, n_tog = parse_divi_toggles(html, url)
            out_tog = save_markdown(md_tog, f"{stem}.md")
            print(f"[toggles   ] {url} -> {out_tog.name}  blocks={n_tog}  size={len(md_tog)}")
        else:
            print(f"[toggles   ] skipped {url}")
    except Exception as e:
        print(f"[error] {url} -> {e}")


async def async_main(urls):
    t0 = time.perf_counter()
    print(f"Running in ASYNC mode with concurrency={MAX_CONCURRENCY}.\n")
    sem = asyncio.Semaphore(MAX_CONCURRENCY)
    async with httpx.AsyncClient(follow_redirects=True, http2=True) as client:
        async def guarded_scrape(u: str):
            async with sem:
                await scrape_one_async(client, u)
        await asyncio.gather(*(guarded_scrape(u) for u in urls))
    dt = (time.perf_counter() - t0)
    print(f"\nAll done in {dt:.2f}s  (async)")


def parse_args():
    ap = argparse.ArgumentParser(description="QC Commencement Scraper (async-only)")
    ap.add_argument("urls", nargs="*", help="Override URLs to scrape")
    return ap.parse_args()


if __name__ == "__main__":
    args = parse_args()
    urls = args.urls or DEFAULT_URLS
    # cleanup
    urls = [u.strip() for u in urls if u.strip()]
    asyncio.run(async_main(urls))
