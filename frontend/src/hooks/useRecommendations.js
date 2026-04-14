import { useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * useRecommendations()
 *
 * Returns:
 *   recommendations  — array of movie objects from the pipeline
 *   history          — array of past queries
 *   loading          — boolean
 *   error            — string | null
 *   search(query)    — call the /recommend endpoint
 *   fetchHistory()   — call the /history endpoint
 */
export function useRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [history, setHistory]                 = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState(null);

  const search = useCallback(async (query, top_k = 5) => {
    if (!query?.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/recommend`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query, top_k }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Recommendation failed");
      }

      const data = await res.json();
      setRecommendations(data.recommendations);
      return data;                          // caller can use query_id if needed
    } catch (e) {
      setError(e.message);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (limit = 10) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/history?limit=${limit}`);
      const data = await res.json();
      setHistory(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { recommendations, history, loading, error, search, fetchHistory };
}

