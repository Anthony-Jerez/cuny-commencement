# CUNY Commencement Q&A AI Assistant

"My family won't see me graduate unless they know where to be, when to arrive, and what to bring." These are the statements that I would often hear from graduates as commencement approached. Instead of letting their parents get peppered with questions all weekend, I built a app for them, that answers everything that has to do with graduation/commencement.

## Description
The app scrapes official info, indexes it, and lets users chat with a AI assistant that leverages RAG to get fast, grounded answers. It supports Clerk auth (Email & Google), persists conversations in SQLite, and cites sources to ensure accuracy.

## Features

1. Asynchronous web scraper
- Fetches commencement details (dates, tickets, parking, venue rules, etc.) from official QC web pages.
- HTML parsing with Beautiful Soup.
- Uses httpx & asyncio to run requests concurrently.
- Disk caching to avoid re-downloading; cleaning & deduping.
2. RAG Agent 
- Answers come from Gemini LLM augmented by retrieved source chunks.
- LlamaIndex for chunking/embeddings/orchestration.
- Chroma as the vector store.
- Returns citations so users can verify on the original pages.
3. Chat history
- SQLite stores conversations per Clerk userId.
- "Past chats" menu drawer to view & delete conversations.
- Auto-titles chats from the first user message.
4. Authentication
- Clerk: Email/Password with email-code verification & Google SSO.
- Expo deep link scheme for mobile OAuth redirects.

## Tech Stack

#### Frontend:
- React Native, Expo, TypeScript
- Clerk (Email/Password, Google SSO)
- Expo-sqlite (chat persistence)
- Expo Router

#### Backend:
- Python, FastAPI
- Beautiful Soup (HTML parsing)
- httpx + asyncio for async web scraping
- LlamaIndex (RAG pipeline)
- Chroma (vector store)

## Video Demo
[Watch the full video demo here](https://youtube.com/shorts/WxkxQa_Q7DE?feature=share)

## How it Works
1. Scrape & Cache: Async scraper fetches content from official pages and caches it on disk to avoid re-fetching unchanged content.

2. Chunk & Embed -> Chroma: LlamaIndex cleans & chunks the pages, computes embeddings, and persists the vector index to Chroma

3. Retrieve: For each user question, top-k relevant chunks are pulled from Chroma.

4. Generate: The model synthesizes an answer grounded in retrieved text and returns citations.

5. Persist: If signed in, the mobile app saves the conversation in SQLite, scoped per Clerk user.

## Setup
1. Prerequisites
- Node.js & pnpm/yarn/npm
- Python 3.10+
- Expo
- Clerk project with Email/Password & Google enabled

2. Backend
From backend root:
```
python -m venv .venv
source .venv/bin/activate # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```
Create .env:
```
GEMINI_API_KEY=your_key_here
GEMINI_EMBED_MODEL=text-embedding-004
GEMINI_CHAT_MODEL=gemini-2.5-flash
EMBED_BATCH_SIZE=96
CHUNK_MAX_CHARS=1200
CHUNK_OVERLAP=150
```
Scrape & build Chroma index:
```
# scrape official sources
python backend/scraper.py

# build Chroma index from the cached documents
python backend/build_index_llama.py
```
Run the API:
```
uvicorn server:app --reload --port 8000
```

3. Frontend
From project root:
```
npm install # or: pnpm install / yarn
```
Expo config (modify app.json):
```
{
  "expo": {
    "scheme": "cunycommencement",
    "extra": {
      "EXPO_PUBLIC_API_BASE": "http://localhost:8000",
      "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_test_..."
    }
  }
}
```
Run: 
```
npx expo start
```


