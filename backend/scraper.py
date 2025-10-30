from __future__ import annotations
import asyncio
import argparse
import re
import time
from urllib.parse import urljoin
import httpx
from bs4 import BeautifulSoup
from rag.cache import DiskCache
from constants import DEFAULT_URLS, HEADERS, MAX_CONCURRENCY, REQUEST_TIMEOUT, NOISE_PATTERNS, NOISE_TITLES

# HTML helpers
def make_soup(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "html.parser")

def element_to_text(el, base_url: str) -> str:
    """Convert raw HTML to a clean, markdown-like text."""
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

    # Remove noise tags
    for tag in el.find_all(["script", "style", "noscript"]):
        tag.decompose()

    # Keep headings/paragraphs separated by newlines
    text = el.get_text("\n", strip=True)
    # Normalize whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def page_title_from(soup: BeautifulSoup, fallback: str) -> str:
    return soup.title.get_text(strip=True) if soup.title else fallback

def should_scrape_toggles(url: str) -> bool:
    """Primary content via Divi toggles (graduates & guests)."""
    u = url.rstrip("/")
    return ("/ce/for-graduates" in u) or ("/ce/for-guests" in u)

def should_scrape_text_inners(url: str) -> bool:
    """Grab text-inner blocks for these pages. Skips for-guests."""
    u = url.rstrip("/")
    return ("/ce/for-graduates" in u) or ("/a/directions" in u) or ("/ce/faq" in u)

# Section extraction

def extract_sections_divi_toggles(html: str, url: str) -> list[dict]:
    """Return a list of sections from Divi toggle blocks: {'title', 'text'}."""
    soup = make_soup(html)
    blocks = []
    if "/ce/for-guests" in url.rstrip("/"):
        exact_selector = 'div[class="et_pb_module et_pb_toggle et_pb_toggle_0 et_pb_toggle_item et_pb_toggle_open"]'
        blocks = soup.select(exact_selector)
        if not blocks:
            blocks = soup.select("div.et_pb_module.et_pb_toggle.et_pb_toggle_item")
    else:
        blocks = soup.select("div.et_pb_module.et_pb_toggle.et_pb_toggle_item")

    sections = []
    for i, tg in enumerate(blocks, 1):
        title_el = tg.select_one(".et_pb_toggle_title")
        body_el = tg.select_one(".et_pb_toggle_content")
        title = (title_el.get_text(" ", strip=True) if title_el else f"Section {i}").strip()
        text = element_to_text(body_el or tg, url)
        if text:
            sections.append({"title": title, "text": text})
    return sections

def extract_sections_text_inners(html: str, url: str) -> list[dict]:
    """Return a list of sections from all div[class='et_pb_text_inner'] blocks."""
    soup = make_soup(html)
    blocks = soup.select('div[class="et_pb_text_inner"]')

    sections = []
    for i, el in enumerate(blocks, 1):
        heading = el.find(["h1", "h2", "h3", "h4", "h5", "h6"])
        title = heading.get_text(" ", strip=True) if (heading and heading.get_text(strip=True)) else None

        if not title:
            parent = el.find_parent(["section", "article", "div"]) or el
            prev_h = parent.find_previous(["h2", "h3", "h4", "h5", "h6"])
            if prev_h and prev_h.get_text(strip=True):
                title = prev_h.get_text(" ", strip=True)

        text = element_to_text(el, url)
        if text:
            sections.append({"title": title or f"Text Block {i}", "text": text})

    return sections

# Cleanup & de-dup

def _sha1_key(title: str, text: str) -> str:
    # local tiny hash to dedupe section
    # simple rolling hash; adequate for de-dupe keys
    h = 0
    for ch in (title + "\n" + text):
        h = (h * 131 + ord(ch)) & 0xFFFFFFFF
    return str(h)

def dedupe_sections(sections: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for s in sections:
        key = _sha1_key((s.get("title") or "").strip(), (s.get("text") or "").strip())
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
    return out

def filter_noise_sections(sections: list[dict]) -> list[dict]:
    out = []
    for s in sections:
        title = (s.get("title") or "").strip()
        text = (s.get("text") or "").strip()
        if title in NOISE_TITLES:
            continue
        if NOISE_PATTERNS.search(title) or NOISE_PATTERNS.search(text):
            if len(text) < 160:
                continue
        out.append(s)
    return out

def merge_adjacent_same_title(sections: list[dict]) -> list[dict]:
    if not sections:
        return sections
    merged = [sections[0]]
    for s in sections[1:]:
        if s.get("title") == merged[-1].get("title"):
            merged[-1]["text"] = (merged[-1]["text"].rstrip() + "\n\n" + s["text"].lstrip())
        else:
            merged.append(s)
    return merged

# Networking

async def fetch_html_async(client: httpx.AsyncClient, url: str) -> tuple[str, str]:
    t0 = time.perf_counter()
    print(f"[fetch start] {url}")
    resp = await client.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    html = resp.text
    proto = resp.extensions.get("http_version", b"HTTP/1.1")
    dt_ms = (time.perf_counter() - t0) * 1000
    print(f"[fetch done ] {url}  ({dt_ms:.0f} ms, {len(html):,} chars, {proto})")
    soup = make_soup(html)
    title = page_title_from(soup, url)
    return html, title

# Orchestration

async def scrape_one(cache: DiskCache, client: httpx.AsyncClient, url: str) -> None:
    """Fetch, parse, clean, and cache one URL."""
    html, page_title = await fetch_html_async(client, url)

    sections_all: list[dict] = []
    if should_scrape_text_inners(url):
        sections_all.extend(extract_sections_text_inners(html, url))
    else:
        print(f"[text_inner] skipped {url}")

    if should_scrape_toggles(url):
        sections_all.extend(extract_sections_divi_toggles(html, url))
    else:
        print(f"[toggles   ] skipped {url}")

    # Clean & normalize
    sections_all = dedupe_sections(sections_all)
    sections_all = filter_noise_sections(sections_all)
    sections_all = merge_adjacent_same_title(sections_all)

    # Write to cache
    out_path = cache.put({
        "url": url,
        "page_title": page_title,
        "sections": sections_all,
    })
    print(f"[cache] {url} -> {out_path}  sections={len(sections_all)}")

async def async_main(urls: list[str]) -> None:
    t0 = time.perf_counter()
    print(f"Running in ASYNC mode with concurrency={MAX_CONCURRENCY}.\n")
    limits = httpx.Limits(max_connections=10, max_keepalive_connections=5)
    sem = asyncio.Semaphore(MAX_CONCURRENCY)
    cache = DiskCache()

    async with httpx.AsyncClient(follow_redirects=True, http2=True, limits=limits) as client:
        async def guarded(u: str):
            async with sem:
                try:
                    await scrape_one(cache, client, u)
                except Exception as e:
                    print(f"[error] {u} -> {e}")

        await asyncio.gather(*(guarded(u) for u in urls))

    dt_s = (time.perf_counter() - t0)
    print(f"\nAll done in {dt_s:.2f}s  (async)")

def parse_args():
    ap = argparse.ArgumentParser(description="QC Commencement Scraper (async + cache)")
    ap.add_argument("urls", nargs="*", help="Override URLs to scrape")
    return ap.parse_args()

if __name__ == "__main__":
    args = parse_args()
    urls = args.urls or DEFAULT_URLS
    urls = [u.strip() for u in urls if u.strip()]
    asyncio.run(async_main(urls))
