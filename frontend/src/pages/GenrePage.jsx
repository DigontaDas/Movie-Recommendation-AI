/**
 * frontend/src/pages/GenrePage.jsx
 * 
 * Route: /genre/:genreId
 * Shows paginated movies for a specific TMDB genre.
 */
import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Spinner from '../components/Spinner'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'
const API_OPTIONS = {
  headers: { accept: 'application/json', Authorization: `Bearer ${TMDB_KEY}` }
}

const GENRES = [
  { id: 28,    name: 'Action',    emoji: '💥' },
  { id: 35,    name: 'Comedy',    emoji: '😂' },
  { id: 18,    name: 'Drama',     emoji: '🎭' },
  { id: 27,    name: 'Horror',    emoji: '👻' },
  { id: 878,   name: 'Sci-Fi',    emoji: '🚀' },
  { id: 10749, name: 'Romance',   emoji: '❤️' },
  { id: 53,    name: 'Thriller',  emoji: '🔪' },
  { id: 16,    name: 'Animation', emoji: '🎨' },
  { id: 80,    name: 'Crime',     emoji: '🕵️' },
  { id: 12,    name: 'Adventure', emoji: '🗺️' },
]

const SORT_OPTIONS = [
  { value: 'popularity.desc',      label: 'Most Popular' },
  { value: 'vote_average.desc',    label: 'Highest Rated' },
  { value: 'release_date.desc',    label: 'Newest First' },
  { value: 'revenue.desc',         label: 'Highest Grossing' },
]

function MovieCard({ movie }) {
  const [hovered, setHovered] = useState(false)
  const poster = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : null

  return (
    <div
      style={{
        background: '#0f0d23', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        transition: 'all 0.25s',
        boxShadow: hovered ? '0 12px 30px rgba(0,0,0,0.4)' : 'none',
        borderColor: hovered ? 'rgba(108,99,255,0.4)' : 'rgba(255,255,255,0.07)'
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: 'relative', height: '240px', background: '#1a1a2e' }}>
        {poster
          ? <img src={poster} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>🎬</div>
        }
        {movie.vote_average > 0 && (
          <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.75)', color: '#ffd700', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(255,210,0,0.3)' }}>
            ★ {movie.vote_average.toFixed(1)}
          </div>
        )}
      </div>
      <div style={{ padding: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {movie.title}
        </p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          {movie.release_date?.slice(0, 4) || ''}
        </p>
        {movie.overview && (
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '6px 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {movie.overview}
          </p>
        )}
      </div>
    </div>
  )
}

export default function GenrePage() {
  const { genreId } = useParams()
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sortBy, setSortBy] = useState('popularity.desc')

  const genre = GENRES.find(g => g.id === parseInt(genreId))

  useEffect(() => {
    setLoading(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    fetch(
      `${TMDB_BASE}/discover/movie?with_genres=${genreId}&sort_by=${sortBy}&page=${page}&vote_count.gte=100`,
      API_OPTIONS
    )
      .then(r => r.json())
      .then(d => {
        setMovies(d.results || [])
        setTotalPages(Math.min(d.total_pages || 1, 50))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [genreId, page, sortBy])

  // Reset page when sort or genre changes
  useEffect(() => { setPage(1) }, [genreId, sortBy])

  return (
    <div style={{ minHeight: '100vh', background: '#030014', color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Nav ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 40px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(3,0,20,0.95)', position: 'sticky', top: 0, zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/ilogo.png" alt="Logo" style={{ width: 36, height: 36 }} />
          <a href="/" className='text-2xl font-bold hover:text-gradient'>Movie Man</a>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>← Home</a>
          <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>Dashboard</a>
        </div>
      </nav>

      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <a href="/" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Home</a>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>›</span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Genres</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>›</span>
            <span style={{ fontSize: '13px', color: '#a78bfa' }}>{genre?.name || genreId}</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 4px', textAlign: 'left', maxWidth: 'none' }}>
            {genre?.emoji} {genre?.name || 'Genre'} Movies
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 }}>
            Discover the best {genre?.name?.toLowerCase()} films
          </p>
        </div>

        {/* ── Other Genres ── */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {GENRES.filter(g => g.id !== parseInt(genreId)).map(g => (
            <a key={g.id} href={`/genre/${g.id}`}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600,
                padding: '5px 14px', borderRadius: '16px', textDecoration: 'none', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.18)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
            >
              {g.emoji} {g.name}
            </a>
          ))}
        </div>

        {/* ── Sort control ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Sort by:</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {SORT_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setSortBy(opt.value)}
                style={{
                  background: sortBy === opt.value ? 'linear-gradient(135deg,#6c63ff,#a78bfa)' : 'rgba(255,255,255,0.05)',
                  border: sortBy === opt.value ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  color: sortBy === opt.value ? '#fff' : 'rgba(255,255,255,0.55)',
                  fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '8px',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', gap: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
            <Spinner /> Loading movies…
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '16px', marginBottom: '36px' }}>
            {movies.map(m => <MovieCard key={m.id} movie={m} />)}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: page === 1 ? 'rgba(255,255,255,0.25)' : '#fff',
                fontSize: '13px', fontWeight: 700, padding: '8px 18px', borderRadius: '8px',
                cursor: page === 1 ? 'not-allowed' : 'pointer'
              }}
            >‹ Prev</button>

            {/* Page number pills */}
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let p
              if (totalPages <= 7) p = i + 1
              else if (page <= 4) p = i + 1
              else if (page >= totalPages - 3) p = totalPages - 6 + i
              else p = page - 3 + i
              return p
            }).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{
                  background: p === page ? 'linear-gradient(135deg,#6c63ff,#a78bfa)' : 'rgba(255,255,255,0.05)',
                  border: p === page ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  color: p === page ? '#fff' : 'rgba(255,255,255,0.55)',
                  fontSize: '13px', fontWeight: 700, width: '38px', height: '38px',
                  borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s'
                }}>
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: page === totalPages ? 'rgba(255,255,255,0.25)' : '#fff',
                fontSize: '13px', fontWeight: 700, padding: '8px 18px', borderRadius: '8px',
                cursor: page === totalPages ? 'not-allowed' : 'pointer'
              }}
            >Next ›</button>

            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginLeft: '8px' }}>
              Page {page} of {totalPages}
            </span>
          </div>
        )}

      </div>
    </div>
  )
}