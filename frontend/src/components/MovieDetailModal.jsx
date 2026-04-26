import React, { useEffect, useState } from "react";

const FALLBACK_POSTER = "/no-movie.png";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_ORIGINAL = "https://image.tmdb.org/t/p/original";
const TMDB_IMAGE_POSTER = "https://image.tmdb.org/t/p/w500";
const TMDB_TOKEN = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_OPTIONS = TMDB_TOKEN
  ? {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${TMDB_TOKEN}`,
      },
    }
  : null;

function normalizeScore(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const numeric = Number(value);
  if (numeric <= 1) return numeric * 10;
  if (numeric <= 5) return numeric * 2;
  return numeric;
}

function formatRuntime(runtime) {
  if (!runtime || Number.isNaN(Number(runtime))) return null;
  const totalMinutes = Number(runtime);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function buildPoster(movie) {
  return (
    movie.poster_url ||
    (movie.poster_path ? `${TMDB_IMAGE_POSTER}${movie.poster_path}` : FALLBACK_POSTER)
  );
}

function buildBackdrop(movie) {
  return (
    movie.backdrop_url ||
    (movie.backdrop_path ? `${TMDB_IMAGE_ORIGINAL}${movie.backdrop_path}` : null) ||
    buildPoster(movie)
  );
}

function getReleaseYear(movie) {
  return (
    movie.year ||
    movie.release_date?.split("-")[0] ||
    movie.first_air_date?.split("-")[0] ||
    ""
  );
}

function buildYoutubeEmbedUrl(videoKey) {
  if (!videoKey) return null;
  return `https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&mute=1&controls=1&rel=0&playsinline=1&playlist=${videoKey}&loop=1`;
}

function pickTrailer(videos = []) {
  const youtubeVideos = videos.filter((video) => video.site === "YouTube");
  return (
    youtubeVideos.find((video) => video.type === "Trailer" && video.official) ||
    youtubeVideos.find((video) => video.type === "Trailer") ||
    youtubeVideos.find((video) => video.type === "Teaser") ||
    youtubeVideos[0] ||
    null
  );
}

async function searchTmdbMovie(movie) {
  if (!TMDB_OPTIONS) return null;

  const query = movie.title?.trim();
  if (!query) return null;

  const attempts = [
    getReleaseYear(movie)
      ? `/search/movie?query=${encodeURIComponent(query)}&year=${encodeURIComponent(getReleaseYear(movie))}`
      : null,
    `/search/movie?query=${encodeURIComponent(query)}`,
  ].filter(Boolean);

  for (const path of attempts) {
    try {
      const response = await fetch(`${TMDB_BASE}${path}`, TMDB_OPTIONS);
      if (!response.ok) continue;
      const data = await response.json();
      if (data.results?.length) {
        return data.results[0];
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function fetchTmdbDetails(movie) {
  if (!TMDB_OPTIONS) return null;

  let tmdbId =
    movie.tmdb_id ||
    movie.tmdbId ||
    (typeof movie.id === "number" && movie.poster_path ? movie.id : null);

  let baseMovie = movie;

  if (!tmdbId) {
    const searchedMovie = await searchTmdbMovie(movie);
    if (!searchedMovie) return null;
    tmdbId = searchedMovie.id;
    baseMovie = { ...movie, ...searchedMovie };
  }

  try {
    const response = await fetch(
      `${TMDB_BASE}/movie/${tmdbId}?append_to_response=videos,credits`,
      TMDB_OPTIONS,
    );
    if (!response.ok) return baseMovie;

    const details = await response.json();
    return {
      ...baseMovie,
      ...details,
      tmdb_id: tmdbId,
      poster_url:
        movie.poster_url ||
        (details.poster_path ? `${TMDB_IMAGE_POSTER}${details.poster_path}` : null) ||
        baseMovie.poster_url ||
        null,
      backdrop_url:
        details.backdrop_path ? `${TMDB_IMAGE_ORIGINAL}${details.backdrop_path}` : null,
    };
  } catch {
    return baseMovie;
  }
}

export default function MovieDetailModal({
  movie,
  onClose,
  onAddToWatchlist,
  isInWatchlist = false,
}) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!movie) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [movie, onClose]);

  useEffect(() => {
    let cancelled = false;

    if (!movie) {
      setDetails(null);
      setLoading(false);
      return undefined;
    }

    setDetails(movie);
    setLoading(true);

    fetchTmdbDetails(movie)
      .then((result) => {
        if (!cancelled && result) {
          setDetails(result);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [movie]);

  const activeMovie = details || movie || null;
  const genres = activeMovie?.genres?.length
    ? activeMovie.genres.map((genre) =>
        typeof genre === "string" ? genre : genre.name,
      )
    : String(activeMovie?.genre || activeMovie?.genres_str || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  if (!activeMovie) return null;

  const poster = buildPoster(activeMovie);
  const backdrop = buildBackdrop(activeMovie);
  const releaseYear = getReleaseYear(activeMovie);
  const score = normalizeScore(activeMovie.score ?? activeMovie.vote_average);
  const cast = (activeMovie.credits?.cast || [])
    .slice(0, 4)
    .map((person) => person.name)
    .filter(Boolean);
  const runtime = formatRuntime(activeMovie.runtime);
  const trailer = pickTrailer(activeMovie.videos?.results || []);
  const trailerUrl = buildYoutubeEmbedUrl(trailer?.key);
  const subtitleLine = activeMovie.reason || activeMovie.tagline || activeMovie.overview;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(14px)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(1024px, 100%)",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#161616",
          borderRadius: "24px",
          boxShadow: "0 32px 72px rgba(0,0,0,0.62)",
          color: "#fff",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.46)",
            color: "#fff",
            cursor: "pointer",
            fontSize: 28,
            zIndex: 5,
          }}
        >
          ×
        </button>

        <div
          style={{
            position: "relative",
            minHeight: 500,
            background: "#0c0c0c",
            overflow: "hidden",
            borderRadius: "24px 24px 0 0",
          }}
        >
          {trailerUrl ? (
            <iframe
              title={`${activeMovie.title} trailer`}
              src={trailerUrl}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          ) : (
            <img
              src={backdrop}
              alt={activeMovie.title}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          )}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.28) 42%, rgba(22,22,22,0.96) 100%)",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 32,
              right: 32,
              bottom: 32,
              display: "grid",
              gap: 16,
              zIndex: 2,
            }}
          >
            <div style={{ display: "grid", gap: 10, maxWidth: 760 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  color: "#e50914",
                  textTransform: "uppercase",
                }}
              >
                Movie Man
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(42px, 7vw, 74px)",
                  lineHeight: 0.92,
                  fontWeight: 900,
                  textAlign: "left",
                  maxWidth: "none",
                  textTransform: "uppercase",
                  fontFamily: "'Bebas Neue', sans-serif",
                  letterSpacing: "0.01em",
                  textShadow: "0 10px 24px rgba(0,0,0,0.45)",
                }}
              >
                {activeMovie.title}
              </h2>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => window.open(trailer?.key ? `https://www.youtube.com/watch?v=${trailer.key}` : "#", "_blank", "noopener,noreferrer")}
                disabled={!trailer?.key}
                style={{
                  background: "#fff",
                  border: "none",
                  color: "#111",
                  borderRadius: 10,
                  padding: "14px 28px",
                  fontWeight: 800,
                  fontSize: 18,
                  cursor: trailer?.key ? "pointer" : "default",
                  opacity: trailer?.key ? 1 : 0.7,
                }}
              >
                ▶ Play
              </button>
              <button
                type="button"
                onClick={() => onAddToWatchlist?.(activeMovie)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.52)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: 28,
                  cursor: "pointer",
                }}
                aria-label={isInWatchlist ? "Already in watchlist" : "Add to watchlist"}
              >
                {isInWatchlist ? "✓" : "+"}
              </button>
              {subtitleLine && (
                <p
                  style={{
                    margin: 0,
                    maxWidth: 520,
                    fontSize: 20,
                    lineHeight: 1.35,
                    fontWeight: 700,
                    fontStyle: "italic",
                    textShadow: "0 8px 22px rgba(0,0,0,0.42)",
                  }}
                >
                  {subtitleLine}
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: "28px 30px 34px", display: "grid", gap: 26 }}>
          {loading && (
            <p style={{ margin: 0, color: "rgba(255,255,255,0.54)", fontSize: 13 }}>
              Loading richer movie details...
            </p>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.1fr) minmax(280px, 0.9fr)",
              gap: 28,
            }}
          >
            <div style={{ display: "grid", gap: 18 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                {releaseYear && (
                  <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 16 }}>{releaseYear}</span>
                )}
                {runtime && (
                  <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 16 }}>{runtime}</span>
                )}
                {score != null && (
                  <span
                    style={{
                      color: "#46d369",
                      fontWeight: 800,
                      fontSize: 16,
                    }}
                  >
                    {score.toFixed(1)} Match
                  </span>
                )}
                <span
                  style={{
                    border: "1px solid rgba(255,255,255,0.4)",
                    borderRadius: 4,
                    padding: "1px 6px",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.82)",
                    fontWeight: 700,
                  }}
                >
                  HD
                </span>
                {(activeMovie.original_language || "").toUpperCase() && (
                  <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 16 }}>
                    {(activeMovie.original_language || "").toUpperCase()}
                  </span>
                )}
              </div>

              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 18,
                  lineHeight: 1.7,
                }}
              >
                {activeMovie.overview || activeMovie.reason || "No description available yet."}
              </p>
            </div>

            <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: 16, lineHeight: 1.6 }}>
                <span style={{ color: "rgba(255,255,255,0.32)" }}>Cast: </span>
                <span style={{ color: "#fff", fontWeight: 700 }}>
                  {cast.length ? cast.join(", ") : "Unknown"}
                </span>
              </p>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: 16, lineHeight: 1.6 }}>
                <span style={{ color: "rgba(255,255,255,0.32)" }}>Genres: </span>
                <span style={{ color: "#fff", fontWeight: 700 }}>
                  {genres.length ? genres.join(", ") : "Unknown"}
                </span>
              </p>
              {activeMovie.reason && (
                <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: 16, lineHeight: 1.6 }}>
                  <span style={{ color: "rgba(255,255,255,0.32)" }}>Why it fits: </span>
                  <span style={{ color: "#fff", fontWeight: 700 }}>{activeMovie.reason}</span>
                </p>
              )}
            </div>
          </div>

          {!trailerUrl && poster && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: 18,
                borderRadius: 18,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <img
                src={poster}
                alt={activeMovie.title}
                style={{
                  width: 88,
                  height: 132,
                  objectFit: "cover",
                  borderRadius: 12,
                  flexShrink: 0,
                }}
              />
              <div style={{ display: "grid", gap: 6 }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                  Trailer unavailable for this title
                </p>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.58)", lineHeight: 1.6 }}>
                  We could still find the movie details, but no playable trailer was available from TMDB for this title.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
