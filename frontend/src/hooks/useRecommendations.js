import { useCallback, useState } from "react";
import { authFetch } from "../lib/auth";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (query, top_k = 5) => {
    if (!query?.trim()) return null;

    setLoading(true);
    setError(null);

    try {
      const res = await authFetch(`${API_BASE}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, top_k }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Recommendation failed");
      }

      setRecommendations(data.recommendations || []);
      return data;
    } catch (e) {
      setError(e.message);
      setRecommendations([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (limit = 10) => {
    setLoading(true);
    setError(null);

    try {
      const res = await authFetch(`${API_BASE}/history?limit=${limit}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Could not load history.");
      }
      setHistory(data);
      return data;
    } catch (e) {
      setError(e.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { recommendations, history, loading, error, search, fetchHistory };
}
