import json, hashlib, pathlib, datetime
from typing import Dict, Any, List, Optional

DEFAULT_DIR = pathlib.Path("cache")

def _sha1(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()

class DiskCache:
    """
    Minimal filesystem cache for parsed pages.
    Stores one JSON per page keyed by URL hash, plus a manifest for listing.

    Page record:
    {
        "url": str,
        "page_title": str,
        "fetched_at": str (ISO),
        "sections": [{"title": str, "text": str}, ...],
        "content_sha1": str
    }
    """
    def __init__(self, base_dir: pathlib.Path = DEFAULT_DIR):
        self.base_dir = pathlib.Path(base_dir)
        self.pages_dir = self.base_dir / "pages"
        self.manifest_path = self.base_dir / "manifest.json"
        self.pages_dir.mkdir(parents=True, exist_ok=True)
        if not self.manifest_path.exists():
            self._write_manifest({"created_at": datetime.datetime.utcnow().isoformat(), "items": []})

    def _page_path(self, url: str) -> pathlib.Path:
        return self.pages_dir / f"{_sha1(url)}.json"

    def _read_manifest(self) -> Dict[str, Any]:
        return json.loads(self.manifest_path.read_text(encoding="utf-8"))

    def _write_manifest(self, data: Dict[str, Any]) -> None:
        self.manifest_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def put(self, record: Dict[str, Any]) -> pathlib.Path:
        assert "url" in record and "sections" in record, "record must have url and sections"
        concat = "\n\n".join(sec.get("text", "") for sec in record["sections"])
        record["content_sha1"] = _sha1(concat)
        record.setdefault("fetched_at", datetime.datetime.utcnow().isoformat())

        p = self._page_path(record["url"])
        p.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")

        man = self._read_manifest()
        items: List[Dict[str, Any]] = man.get("items", [])
        found = False
        for it in items:
            if it.get("url") == record["url"]:
                it.update({
                    "page_title": record.get("page_title"),
                    "fetched_at": record.get("fetched_at"),
                    "content_sha1": record.get("content_sha1"),
                    "path": str(p)
                })
                found = True
                break
        if not found:
            items.append({
                "url": record["url"],
                "page_title": record.get("page_title"),
                "fetched_at": record.get("fetched_at"),
                "content_sha1": record.get("content_sha1"),
                "path": str(p)
            })
        man["items"] = items
        self._write_manifest(man)
        return p

    def get(self, url: str) -> Optional[Dict[str, Any]]:
        p = self._page_path(url)
        if not p.exists():
            return None
        return json.loads(p.read_text(encoding="utf-8"))

    def list_all(self) -> List[Dict[str, Any]]:
        man = self._read_manifest()
        out: List[Dict[str, Any]] = []
        for it in man.get("items", []):
            path = pathlib.Path(it["path"])
            if path.exists():
                out.append(json.loads(path.read_text(encoding="utf-8")))
        return out

    def list_meta(self) -> List[Dict[str, Any]]:
        return self._read_manifest().get("items", [])
