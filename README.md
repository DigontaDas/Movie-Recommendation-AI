# 🎬 Movie Recommendation AI

![Movie Man](https://github.com/user-attachments/assets/d3e41f90-23e2-4526-8f40-0b924ce84ce5)

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6B6B?style=for-the-badge)](https://trychroma.com/)
[![Ollama](https://img.shields.io/badge/Ollama-000000?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.ai/)

A production-grade, AI-powered movie recommendation engine. It combines the blazing-fast vector search capabilities of **ChromaDB** with the reasoning power of local LLMs via **Ollama** to deliver hyper-personalized movie suggestions with human-readable explanations.

---

## 🌟 Key Features

- **Semantic Search**: Understands complex queries like *"mind-bending sci-fi thriller like Inception"*.
- **AI Reranking & Reasoning**: Uses an LLM to evaluate candidates and explain *why* you'll love them.
- **Personalization**: Learns from your search history and biases results toward your unique taste.
- **Local First**: Runs embeddings and LLM inference locally—no expensive API keys needed!
- **Modern Stack**: Built with FastAPI (Backend) and React/Vite (Frontend).

---

## 🏗️ Architecture Overview

For an in-depth breakdown of the system design, data flow, and components, please read the [Architecture Documentation](architecture.md).

### How It Works (High Level)

```mermaid
flowchart TD
    A[User Query] -->|e.g. "animated movie for kids"| B[Sentence-Transformer]
    B -->|Generates Embeddings| C[(ChromaDB Vector Search)]
    C -->|Top K Candidates| D{Ollama LLaMA}
    D -->|Reranks & Explains| E[FastAPI]
    E -->|JSON Response| F[Frontend / User]
```

---

## 📂 File Structure

```text
movie-recommender-ai/
├── src/movie_recommender/
│   ├── config.py               # Pydantic settings — all config in one place
│   ├── logging_config.py       # Structured logging setup
│   ├── data/
│   │   ├── movielens_loader.py # Loads raw CSVs into DataFrames
│   │   └── preprocess.py       # Cleans, filters, builds text_blob per movie
│   ├── embeddings/
│   │   └── embedder.py         # Sentence-transformer wrapper
│   ├── vector_db/
│   │   └── chroma_client.py    # ChromaDB client — create, upload, search
│   ├── llm/
│   │   └── ollama_client.py    # Ollama API wrapper
│   ├── recommender/
│   │   ├── retrieve.py         # Embed query → search ChromaDB → candidates
│   │   ├── rerank.py           # Send candidates to LLM → ranked + reasons
│   │   └── pipeline.py         # retrieve → rerank in one function call
│   ├── db/
│   │   └── sqlite_store.py     # Persist queries + results to SQLite
│   └── api/
│       └── main.py             # FastAPI app — /recommend, /history endpoints
├── frontend/                   # React + Vite Frontend UI
├── scripts/
│   ├── build_index.py          # One-time: embed all movies + upload to ChromaDB
│   └── download_movielens.py   # One-time: download MovieLens dataset
├── data/
│   ├── raw/                    # Extracted MovieLens CSVs (gitignored)
│   └── processed/              # Parquet + SQLite files (gitignored)
├── chroma_storage/             # ChromaDB persistence (gitignored)
├── tests/
├── pyproject.toml
└── README.md
```

---

## 🚀 Quickstart (Local Development)

### 1. Clone the repo

```bash
git clone https://github.com/DigontaDas/Movie-Recommendation-AI.git
cd Movie-Recommendation-AI
```

### 2. Set up the Backend (FastAPI)

```bash
# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate
# Mac / Linux
source .venv/bin/activate

# Install dependencies
pip install -e .
pip install pydantic-settings structlog chromadb pyarrow
```

### 3. Download the MovieLens dataset

Go to [grouplens.org/datasets/movielens](https://grouplens.org/datasets/movielens/) and download **ml-latest-small.zip**. Extract it so your folder looks like this:

```text
data/raw/ml-latest-small/
├── movies.csv
├── ratings.csv
├── tags.csv
└── links.csv
```

### 4. Build the ChromaDB index

```bash
python scripts/build_index.py
```

### 5. Start the API

```bash
uvicorn movie_recommender.api.main:app --reload
```
Open your browser at **[http://localhost:8000/docs](http://localhost:8000/docs)** to see the interactive Swagger UI.

### 6. Start the Frontend

Open a new terminal and run:

```bash
cd frontend
npm install
npm run dev
```

---

## ☁️ Deployment Guide

### 1. Deploying the Frontend to Vercel
Vercel is the perfect platform for deploying the React/Vite frontend.

1. Create a free account on [Vercel](https://vercel.com).
2. Connect your GitHub repository from the Vercel Dashboard.
3. In the project setup, set the **Root Directory** to `frontend`.
4. Vercel will automatically detect **Vite**. Leave the build command (`npm run build`) and output directory (`dist`) as default.
5. Add an Environment Variable: `VITE_API_URL` pointing to your deployed backend API URL (e.g., `https://your-backend.render.com`).
6. Click **Deploy**! 🚀

### 2. Deploying the AI Backend (FastAPI + Chroma + Ollama)
Deploying this AI stack requires a server with **persistent storage** (for ChromaDB and SQLite) and **sufficient compute/RAM** (for Sentence Transformers and Ollama). 

> [!WARNING]
> **Why not Vercel for the backend?** Serverless platforms like Vercel have strict 10s–60s timeouts, ~1GB RAM limits, and read-only ephemeral filesystems. They cannot run local vector databases (ChromaDB) or local LLMs (Ollama).

**Recommended Platforms**: [Render](https://render.com), [Railway](https://railway.app), or AWS EC2 / DigitalOcean.

**General Deployment Steps (VPS/Docker):**
1. Provision a Virtual Machine (minimum 4GB RAM, 8GB+ recommended if running Ollama models).
2. Install Docker & Docker Compose on the server.
3. Containerize your FastAPI application (create a `Dockerfile` in the root).
4. Run Ollama as a separate background service or container on the same server (`docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama`).
5. Execute `ollama run llama3` (or your chosen model) to download the weights.
6. Run the FastAPI container, ensuring you mount a persistent volume to `/chroma_storage` and the SQLite database path.

*If you prefer not to host Ollama yourself, you can swap the Ollama client for an API like OpenAI, Groq, or TogetherAI, allowing you to run the FastAPI backend on much smaller, cheaper servers!*

---

### Example API Request
```bash
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{"query": "dark psychological thriller", "top_k": 5}'
```

### Example API Response
```json
{
  "query_id": "1",
  "query": "dark psychological thriller",
  "recommendations": [
    {
      "rank": 1,
      "movie_id": "318",
      "title": "The Shawshank Redemption",
      "year": "1994",
      "genre": "Drama",
      "score": 0.94,
      "reason": "A gripping psychological drama with dark themes of injustice and resilience.",
      "poster_url": null
    }
  ]
}
```
