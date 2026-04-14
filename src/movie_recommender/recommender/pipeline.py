# TODO: end-to-end pipeline
def run_pipeline(query: str, top_k: int = 5) -> list[dict]:
    """
    MOCK PIPELINE: Use this while Mihir finishes Phase 3.
    This allows Digonta to test the FastAPI endpoints and SQLite database.
    """
    print(f"DEBUG: Mock pipeline received query: '{query}'")
    
    # Return dummy data that matches your SQLite schema requirements
    return [
        {
            "movie_id": "9991",
            "title": "The Matrix (Mock Data)",
            "year": "1999",
            "genre": "Sci-Fi / Action",
            "score": 0.98,
            "reason": f"Because you searched for '{query}', the AI thinks you want to question reality.",
            "poster_url": "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg"
        },
        {
            "movie_id": "9992",
            "title": "Inception (Mock Data)",
            "year": "2010",
            "genre": "Sci-Fi / Thriller",
            "score": 0.92,
            "reason": "It features complex dream sequences and mind-bending logic.",
            "poster_url": "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg"
        }
    ][:top_k]