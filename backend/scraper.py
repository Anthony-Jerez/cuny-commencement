import asyncio
import argparse
import datetime as dt
import hashlib
import json
import re
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse
import httpx
from bs4 import BeautifulSoup

# constants
BASE_DIR = Path(__file__).parent
CACHE_DIR = BASE_DIR / "cache"
PAGES_DIR = CACHE_DIR / "pages"
DATA_DIR = BASE_DIR / "data"

for _d in (CACHE_DIR, PAGES_DIR, DATA_DIR):
    _d.mkdir(parents=True, exist_ok=True)

PIPELINE_VERSION = "v1"

HEADERS = {"User-Agent": "QC-CommencementScraper/1.0 (contact: you@example.com)"}

DEFAULT_URLS = [
    "https://www.qc.cuny.edu/ce/for-graduates/",
    "https://www.qc.cuny.edu/ce/for-guests/",
    "https://www.qc.cuny.edu/a/directions/",
    "https://www.qc.cuny.edu/ce/faq/",
]

# Concurrency parameters
MAX_CONCURRENCY = 4
REQUEST_TIMEOUT = 25

# Helpers
def sha1(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()

def now_iso() -> str:
    return dt.datetime.utcnow().isoformat(timespec="microseconds")

def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")

def read_json(path: Path, default=None):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))

def make_soup(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "html.parser")

def element_to_text(el, base_url: str) -> str:
    """Converts raw HTML to markdown"""
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
    # Remove noise
    for tag in el.find_all(["script", "style", "noscript"]):
        tag.decompose()
    # Keep headings and paragraphs as text separated by newlines
    text = el.get_text("\n", strip=True)
    # Normalize whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def page_title_from(soup, fallback: str) -> str:
    return soup.title.get_text(strip=True) if soup.title else fallback

def make_safe_stem(url: str) -> str:
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
    Primary content via Divi toggles (graduates & guests).
    """
    u = url.rstrip("/")
    return ("/ce/for-graduates" in u) or ("/ce/for-guests" in u)

def should_scrape_text_inners(url: str) -> bool:
    """
    Grab text-inner blocks for these pages. Skips for-guests.
    """
    u = url.rstrip("/")
    return ("/ce/for-graduates" in u) or ("/a/directions" in u) or ("/ce/faq" in u)

# Section extraction
def extract_sections_divi_toggles(html: str, url: str) -> list[dict]:
    """
    Return a list of sections from Divi toggle blocks: {"title": ..., "text": ...}
    """
    soup = make_soup(html)
    blocks = []
    if "/ce/for-guests" in url.rstrip("/"):
        # Attempt the exact class structure requested
        exact_selector = 'div[class="et_pb_module et_pb_toggle et_pb_toggle_0 et_pb_toggle_item et_pb_toggle_open"]'
        blocks = soup.select(exact_selector)
        # Fall back to robust structure
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
    """
    Return a list of sections from all div[class="et_pb_text_inner"] blocks.
    """
    soup = make_soup(html)
    blocks = soup.select('div[class="et_pb_text_inner"]')
    sections = []
    for i, el in enumerate(blocks, 1):
        # Prefers a heading inside the block if present
        heading = el.find(["h1", "h2", "h3", "h4", "h5", "h6"])
        title = heading.get_text(" ", strip=True) if (heading and heading.get_text(strip=True)) else None
        # Fallback to nearby previous heading
        if not title:
            parent = el.find_parent(["section", "article", "div"]) or el
            prev_h = parent.find_previous(["h2", "h3", "h4", "h5", "h6"])
            if prev_h and prev_h.get_text(strip=True):
                title = prev_h.get_text(" ", strip=True)
        text = element_to_text(el, url)
        if text:
            sections.append({"title": title or f"Text Block {i}", "text": text})

    return sections

def _dedupe_sections(sections: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for s in sections:
        key = (s.get("title") or "").strip() + "\n" + (s.get("text") or "").strip()
        h = sha1(key)
        if h in seen:
            continue
        seen.add(h)
        out.append(s)
    return out

# Noise filtering & merging to remove garbag/redundant data
NOISE_TITLES = {"Follow Us", "Resources & Links", "© Copyright 2025"}
NOISE_PATTERNS = re.compile(
    r"(©\s*Copyright|Follow\s+Us|Resources\s*&\s*Links|Queens College 65-30 Kissena Blvd)",
    re.I,
)

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

# Caching (per-page JSON & manifest) data
def page_cache_path(content_sha: str) -> Path:
    return PAGES_DIR / f"{content_sha}.json"

def save_page_cache(url: str, page_title: str, fetched_at: str, sections: list[dict]) -> dict:
    # Content hash over all section texts
    joined = "\n\n".join([f'## {s.get("title","")}\n\n{s.get("text","")}' for s in sections])
    content_sha = sha1(joined)
    payload = {
        "url": url,
        "page_title": page_title,
        "fetched_at": fetched_at,
        "sections": sections,
        "content_sha1": content_sha,
    }
    out_path = page_cache_path(content_sha)
    write_json(out_path, payload)
    return {"content_sha1": content_sha, "path": str(out_path.relative_to(BASE_DIR))}

def update_manifest(url: str, page_title: str, fetched_at: str, page_meta: dict):
    mpath = CACHE_DIR / "manifest.json"
    manifest = read_json(mpath, default=None) or {"created_at": now_iso(), "items": []}
    # Replace existing entry for url
    items = [i for i in manifest["items"] if i.get("url") != url]
    items.append({
        "url": url,
        "page_title": page_title,
        "fetched_at": fetched_at,
        "content_sha1": page_meta["content_sha1"],
        "path": page_meta["path"],
    })
    manifest["items"] = items
    write_json(mpath, manifest)

# Chunking
def split_into_chunks(text: str, max_chars: int = 1800) -> list[str]:
    """
    Text splitter by paragraphs to keep context. Fallback to hard wrap if needed.
    """
    if len(text) <= max_chars:
        return [text]
    parts = []
    current = []
    current_len = 0
    for para in text.split("\n\n"):
        p = para.strip()
        if not p:
            continue
        # If adding this paragraph exceeds the limit, flush current
        if current_len + len(p) + 2 > max_chars and current:
            parts.append("\n\n".join(current))
            current = [p]
            current_len = len(p)
        else:
            current.append(p)
            current_len += len(p) + 2
    if current:
        parts.append("\n\n".join(current))
    # If any single chunk is still too long, hard-wrap it
    hard_wrapped = []
    for chunk in parts:
        if len(chunk) <= max_chars:
            hard_wrapped.append(chunk)
        else:
            for i in range(0, len(chunk), max_chars):
                hard_wrapped.append(chunk[i:i+max_chars])
    return hard_wrapped

def make_chunk_records(url: str, page_title: str, fetched_at: str, content_sha: str, sections: list[dict]) -> list[dict]:
    records = []
    for s in sections:
        section_title = (s.get("title") or "").strip()
        section_text = (s.get("text") or "").strip()
        section_sha = sha1(section_title + "\n\n" + section_text)
        chunks = split_into_chunks(section_text)
        for idx, ch in enumerate(chunks):
            chunk_id = sha1(f"{url}|{section_sha}|{idx}")
            records.append({
                "text": ch,
                "meta": {
                    "url": url,
                    "page_title": page_title,
                    "section_title": section_title,
                    "fetched_at": fetched_at,
                    "chunk_index": idx,
                    "chunk_id": chunk_id,
                    "content_sha1": content_sha,
                    "section_sha1": section_sha,
                    "pipeline_version": PIPELINE_VERSION,
                    "source_type": "web",
                }
            })
    return records

def write_chunks_sample(all_records: list[dict], out_path: Path | None = None):
    path = out_path or (DATA_DIR / "chunks_sample.jsonl")
    with path.open("w", encoding="utf-8") as f:
        for r in all_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

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
async def scrape_one(client: httpx.AsyncClient, url: str) -> list[dict]:
    """Fetch, parse, cache one URL. Return its chunk records."""
    fetched_at = now_iso()
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
    # Dedupe & perform cleaning
    sections_all = _dedupe_sections(sections_all)
    sections_all = filter_noise_sections(sections_all)
    sections_all = merge_adjacent_same_title(sections_all)
    # Caching page
    page_meta = save_page_cache(url, page_title, fetched_at, sections_all)
    update_manifest(url, page_title, fetched_at, page_meta)
    # Chunking
    chunk_records = make_chunk_records(
        url=url,
        page_title=page_title,
        fetched_at=fetched_at,
        content_sha=page_meta["content_sha1"],
        sections=sections_all,
    )
    print(f"[cache] {url} -> {page_meta['path']}  sections={len(sections_all)}  chunks={len(chunk_records)}")
    return chunk_records

async def async_main(urls: list[str]):
    t0 = time.perf_counter()
    print(f"Running in ASYNC mode with concurrency={MAX_CONCURRENCY}.\n")
    limits = httpx.Limits(max_connections=10, max_keepalive_connections=5)
    sem = asyncio.Semaphore(MAX_CONCURRENCY)
    all_chunk_records: list[dict] = []
    async with httpx.AsyncClient(follow_redirects=True, http2=True, limits=limits) as client:
        async def guarded(u: str):
            async with sem:
                try:
                    recs = await scrape_one(client, u)
                    all_chunk_records.extend(recs)
                except Exception as e:
                    print(f"[error] {u} -> {e}")

        await asyncio.gather(*(guarded(u) for u in urls))
    # Write a sample combined JSONL for quick verification
    write_chunks_sample(all_chunk_records, DATA_DIR / "chunks_sample.jsonl")
    dt_s = (time.perf_counter() - t0)
    print(f"\nAll done in {dt_s:.2f}s  (async)")

def parse_args():
    ap = argparse.ArgumentParser(description="QC Commencement Scraper (async & cache & chunk)")
    ap.add_argument("urls", nargs="*", help="Override URLs to scrape")
    return ap.parse_args()

if __name__ == "__main__":
    args = parse_args()
    urls = args.urls or DEFAULT_URLS
    urls = [u.strip() for u in urls if u.strip()]
    asyncio.run(async_main(urls))
