<img width="1919" height="872" alt="movie man" src="https://github.com/user-attachments/assets/d3e41f90-23e2-4526-8f40-0b924ce84ce5" />

## How It Works

```
User Query  (e.g. "fun animated movie for kids")
      │
      ▼
Sentence-Transformer 
      │
      ▼
ChromaDB Vector Search 
      │
      ▼
  Ollama LLaMA 
      │
      ▼
  FastAPI  ──►  JSON response 
```

## File Structure

```
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

## Quickstart


### 1. Clone the repo

```bash
git clone https://github.com/DigontaDas/Movie-Recommendation-AI.git
cd Movie-Recommendation-AI
```

### 2. Create and activate virtual environment

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# Mac / Linux
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -e .
pip install pydantic-settings structlog chromadb pyarrow
```

### 4. Download the MovieLens dataset

Go to [grouplens.org/datasets/movielens](https://grouplens.org/datasets/movielens/) and download **ml-latest-small.zip**. Extract it so your folder looks like this:

```
data/raw/ml-latest-small/
├── movies.csv
├── ratings.csv
├── tags.csv
└── links.csv
```



### 5. Build the ChromaDB index

```bash
python scripts/build_index.py
```



### 6. Start the API

Open a new terminal, activate the venv, then:

```bash
uvicorn movie_recommender.api.main:app --reload
```

### Try it out

Open your browser at **[http://localhost:8000/docs](http://localhost:8000/docs)**

Hit `POST /recommend` with:

```json
{
  "query": "mind-bending sci-fi thriller like Inception",
  "top_k": 5
}
```

You'll get back 5 ranked movies with AI-generated explanations.


### Example request

```bash
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{"query": "dark psychological thriller", "top_k": 5}'
```

### Example response

```json
{
  "query_id": 1,
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
