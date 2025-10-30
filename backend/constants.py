from __future__ import annotations
import re

# Networking
HEADERS = {
    "User-Agent": "QC-CommencementScraper/1.0 (contact: you@example.com)"
}
REQUEST_TIMEOUT = 25
MAX_CONCURRENCY = 4

# URLs for the scraper
DEFAULT_URLS = [
    "https://www.qc.cuny.edu/ce/for-graduates/",
    "https://www.qc.cuny.edu/ce/for-guests/",
    "https://www.qc.cuny.edu/a/directions/",
    "https://www.qc.cuny.edu/ce/faq/",
]

# Used to filter noisy data
NOISE_TITLES = {"Follow Us", "Resources & Links", "© Copyright 2025"}
NOISE_PATTERNS = re.compile(
    r"(©\s*Copyright|Follow\s+Us|Resources\s*&\s*Links|Queens College 65-30 Kissena Blvd)",
    re.I,
)
