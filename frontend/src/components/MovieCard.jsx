import React from "react";

export default function MovieCard({ movie, onClick }) {
  const {
    title,
    vote_average,
    poster_path,
    release_date,
    original_language,
  } = movie;

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.(movie);
    }
  };

  return (
    <div
      className="movie-card"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(movie)}
      onKeyDown={handleKeyDown}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <img
        src={poster_path ? `https://image.tmdb.org/t/p/w500/${poster_path}` : "/no-movie.png"}
        alt={title}
      />

      <div className="mt-4">
        <h3>{title}</h3>
        <div className="content">
          <div className="rating">
            <img src="star.svg" alt="Star Icon" />
            <p>{vote_average ? vote_average.toFixed(1) : "N/A"}</p>
          </div>

          <span>•</span>

          <p className="lang">{original_language}</p>

          <span>•</span>

          <p className="year">{release_date ? release_date.split("-")[0] : "N/A"}</p>
        </div>
      </div>
    </div>
  );
}
