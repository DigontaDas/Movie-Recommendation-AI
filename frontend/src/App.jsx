import React, { useState, useEffect, useRef } from 'react'
import Search from './components/Search'
import Spinner from './components/Spinner'
import MovieCard from './components/MovieCard'
import { useDebounce } from 'react-use'
import { getTrendingMovies, updateSearchCount } from './appwrite'
import { useRecommendations } from './hooks/useRecommendations'

const API_BASE_URL = 'https://api.themoviedb.org/3'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY
const API_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`
  }
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

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

// ── Small Netflix-style card for genre rows ──────────────────────────────

function MiniMovieCard({ movie }) {
  const [hovered, setHovered] = useState(false)
  const poster = movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null

  return (
    <div
      className="mini-card"
      style={{ transform: hovered ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.2s', zIndex: hovered ? 5 : 1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="mini-card-img">
        {poster
          ? <img src={poster} alt={movie.title} loading="lazy" />
          : <div className="mini-card-placeholder">🎬</div>
        }
        {movie.vote_average > 0 && (
          <span className="mini-card-score">★ {movie.vote_average.toFixed(1)}</span>
        )}
      </div>
      {hovered && (
        <div className="mini-card-info">
          <p className="mini-card-title">{movie.title}</p>
          {movie.release_date && (
            <p className="mini-card-year">{movie.release_date.slice(0, 4)}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Horizontal genre row with scroll arrows ──────────────────────────────

function GenreRow({ genre }) {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const rowRef = useRef(null)

  useEffect(() => {
    fetch(
      `${API_BASE_URL}/discover/movie?with_genres=${genre.id}&sort_by=popularity.desc&page=1`,
      API_OPTIONS
    )
      .then(r => r.json())
      .then(d => { setMovies(d.results?.slice(0, 20) || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [genre.id])

  const scroll = (dir) => rowRef.current?.scrollBy({ left: dir * 800, behavior: 'smooth' })

  if (loading) return (
    <div className="genre-row-wrap">
      <h3 className="genre-row-title">{genre.emoji} {genre.name}</h3>
      <div style={{ height: 180, display: 'flex', alignItems: 'center', paddingLeft: 16 }}>
        <Spinner />
      </div>
    </div>
  )

  if (!movies.length) return null

  return (
    <div className="genre-row-wrap" id={`genre-${genre.id}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="genre-row-title">{genre.emoji} {genre.name}</h3>
        <a href={`/genre/${genre.id}`} className="genre-see-all">See all →</a>
      </div>
      <div className="genre-row-outer">
        <button className="genre-arrow left" onClick={() => scroll(-1)}>‹</button>
        <div className="genre-row-scroll" ref={rowRef}>
          {movies.map(m => <MiniMovieCard key={m.id} movie={m} />)}
        </div>
        <button className="genre-arrow right" onClick={() => scroll(1)}>›</button>
      </div>
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isAI, setIsAI] = useState(false)
  const [aiTopK, setAiTopK] = useState(10)
  const [hasAISearched, setHasAISearched] = useState(false)
  const { recommendations, loading: aiLoading, error: aiError, search: aiSearch, history: aiHistory, fetchHistory } = useRecommendations()
  const [errorMessage, setErrorMessage] = useState('')
  const [movieList, setMovieList] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [trendingMovies, setTrendingMovies] = useState([])
  const genreRef = useRef(null)

  useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm])

  const fetchMovies = async (query = '') => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const endpoint = query
        ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`
      const response = await fetch(endpoint, API_OPTIONS)
      if (!response.ok) throw new Error('Failed to fetch movies')
      const data = await response.json()
      if (data.Response === 'False') {
        setErrorMessage(data.Error || 'Failed to fetch movies')
        setMovieList([])
        return
      }
      setMovieList(data.results || [])
      if (query && data.results?.length > 0) {
        await updateSearchCount(query, data.results[0])
      }
    } catch (error) {
      console.error(`Error fetching movies: ${error}`)
      setErrorMessage('Error fetching movies. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadTrendingMovies = async () => {
    try {
      const movies = await getTrendingMovies()
      setTrendingMovies(movies || [])
    } catch (error) {
      console.log(`Error fetching trending movies: ${error}`)
      setTrendingMovies([])
    }
  }

  useEffect(() => { fetchMovies(debouncedSearchTerm) }, [debouncedSearchTerm])
  useEffect(() => { loadTrendingMovies(); fetchHistory(8) }, [])

  const handleAISearch = async (q = searchTerm) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setHasAISearched(true)
    await aiSearch(trimmed, aiTopK)
  }

  const handleToggle = (val) => {
    setIsAI(val)
    setHasAISearched(false)
    setSearchTerm('')
  }

  const scrollToGenres = () => genreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <main>
      <div className='pattern' />

      <div className='wrapper'>

        {/* ── Nav ── */}
        <nav className='nav-link flex justify-between items-center py-4'>
          <div className="flex items-center gap-3">
            <img className="w-14 h-14" src="./ilogo.png" alt="Logo" />
            <a href="/" className='text-2xl font-bold hover:text-gradient'>Movie Man</a>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={scrollToGenres}
              style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.7)', fontSize: '20px', fontWeight: 600,
                padding: '6px 16px', borderRadius: '20px', cursor: 'pointer'
              }}
            >
              Genres
            </button>
            <a
              href="/dashboard"
              style={{
                background: 'linear-gradient(135deg,#6c63ff,#a78bfa)',
                border: 'none', color: '#fff', fontSize: '20px', fontWeight: 700,
                padding: '7px 18px', borderRadius: '20px', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '5px'
              }}
            >
              Dashboard
            </a>
          </div>
        </nav>

        {/* ── Header / Hero ── */}
        <header>
          <img src='./hero-img.png' alt='Hero Banner' />
          <h1>
            {isAI
              ? <>Describe a movie <span className='text-gradient'>you're in the mood for</span></>
              : <>Find <span className='text-gradient'>Movies</span> You'll Enjoy</>
            }
          </h1>
          {isAI && (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '14px', maxWidth: '500px', margin: '0 auto 16px' }}>
              Our AI reads your vibe, searches 3,650+ films and picks what you'll actually love.
            </p>
          )}
          {!isAI && <h2 className='flex justify-center items-center'>Right In Your Grasp</h2>}

          {/* ── Search Toggle ── */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px' }}>
              <button
                onClick={() => handleToggle(false)}
                style={{
                  background: !isAI ? 'linear-gradient(135deg,#6c63ff,#a78bfa)' : 'transparent',
                  border: 'none', color: !isAI ? '#fff' : 'rgba(255,255,255,0.45)',
                  fontWeight: 700, fontSize: '15px', padding: '8px 22px', borderRadius: '9px',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: !isAI ? '0 4px 14px rgba(108,99,255,0.35)' : 'none'
                }}
              >🔍 Search</button>
              <button
                onClick={() => handleToggle(true)}
                style={{
                  background: isAI ? 'linear-gradient(135deg,#6c63ff,#a78bfa)' : 'transparent',
                  border: 'none', color: isAI ? '#fff' : 'rgba(255,255,255,0.45)',
                  fontWeight: 700, fontSize: '15px', padding: '8px 22px', borderRadius: '9px',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: isAI ? '0 4px 14px rgba(108,99,255,0.35)' : 'none'
                }}
              >✨ AI Search</button>
            </div>
          </div>

          {/* ── Normal Search ── */}
          {!isAI && <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}

          {/* ── AI Search ── */}
          {isAI && (
            <div style={{ maxWidth: '750px', margin: '0 auto' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'rgba(206,206,251,0.05)', border: '1.5px solid rgba(108,99,255,0.45)',
                borderRadius: '14px', padding: '10px 14px',
                boxShadow: '0 0 0 4px rgba(108,99,255,0.06)'
              }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>✨</span>
                <input
                  type="text"
                  placeholder="e.g. Dark psychological thriller with an unreliable narrator…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAISearch()}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: '#fff', fontSize: '14px', fontFamily: 'DM Sans, sans-serif'
                  }}
                />
                <select
                  value={aiTopK}
                  onChange={e => setAiTopK(+e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff', fontSize: '12px', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer'
                  }}
                >
                  {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} picks</option>)}
                </select>
                <button
                  onClick={() => handleAISearch()}
                  disabled={aiLoading || !searchTerm.trim()}
                  style={{
                    background: 'linear-gradient(135deg,#6c63ff,#a78bfa)', border: 'none',
                    color: '#fff', fontWeight: 700, fontSize: '13px', padding: '9px 20px',
                    borderRadius: '10px', cursor: 'pointer',
                    opacity: (aiLoading || !searchTerm.trim()) ? 0.45 : 1, whiteSpace: 'nowrap'
                  }}
                >
                  {aiLoading ? 'Thinking…' : 'Find Movies →'}
                </button>
              </div>

              {/* AI History pills */}
              {aiHistory.length > 0 && !hasAISearched && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', justifyContent: 'center', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Recent:</span>
                  {aiHistory.slice(0, 5).map(item => (
                    <button key={item.query_id}
                      onClick={() => { setSearchTerm(item.query_text); handleAISearch(item.query_text) }}
                      style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.55)', fontSize: '12px', padding: '5px 12px',
                        borderRadius: '20px', cursor: 'pointer'
                      }}>
                      🕐 {item.query_text.length > 30 ? item.query_text.slice(0, 30) + '…' : item.query_text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </header>

        {/* ── Trending (Appwrite) ── */}
        {trendingMovies.length > 0 && (
          <section className='trending mt-[150px] mb-[60px]'>
            <h2 className='mb-2'>Trending Movies</h2>
            <ul>
              {trendingMovies.map((movie, index) => (
                <li key={movie.$id}>
                  <p>{index + 1}</p>
                  <img src={movie.poster_url} alt={movie.title} className="h-[180px] w-[126px] rounded-lg object-cover" />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── AI Results ── */}
        {isAI && hasAISearched && (
          <section style={{ marginTop: '40px' }}>
            {aiLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.55)', fontSize: '14px', padding: '2rem 0' }}>
                <Spinner /><span>AI is searching 3,650 movies…</span>
              </div>
            )}
            {aiError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
                ⚠️ {aiError}
              </div>
            )}
            {!aiLoading && recommendations.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2>{recommendations.length} AI Picks for You</h2>
                  <button onClick={() => { setHasAISearched(false); setSearchTerm('') }}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '12px', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer' }}>
                    Clear ✕
                  </button>
                </div>
                <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: '14px', listStyle: 'none', padding: 0 }}>
                  {recommendations.map((movie, i) => (
                    <li key={movie.rank} style={{
                      background: '#0f0d23', border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
                      transition: 'all 0.25s',
                      animationDelay: `${i * 0.05}s`
                    }}>
                      <div style={{ position: 'relative', height: '220px', background: '#1a1a2e' }}>
                        {movie.poster_url
                          ? <img src={movie.poster_url} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🎬</div>
                        }
                        <div style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(108,99,255,0.85)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '5px' }}>#{movie.rank}</div>
                        {movie.score != null && <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.65)', color: '#ffd700', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', border: '1px solid rgba(255,210,0,0.3)' }}>★ {(movie.score * 10).toFixed(1)}</div>}
                      </div>
                      <div style={{ padding: '10px 12px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#fff', margin: '0 0 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</p>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          {movie.year && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{movie.year}</span>}
                          {movie.genre && <span style={{ fontSize: '10px', color: '#a78bfa', background: 'rgba(108,99,255,0.15)', padding: '1px 7px', borderRadius: '10px' }}>{movie.genre}</span>}
                        </div>
                        {movie.reason && <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', lineHeight: 1.4, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>"{movie.reason}"</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {/* ── Normal Movie Grid ── */}
        {!isAI && (
          <section className='all-movies'>
            <h2>All Movies</h2>
            {isLoading ? (
              <Spinner />
            ) : errorMessage ? (
              <p className='text-red-500'>{errorMessage}</p>
            ) : (
              <ul>{movieList.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}</ul>
            )}
          </section>
        )}

        {/* ── Genre Section ── */}
        <div ref={genreRef} style={{ marginTop: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h2>Browse by Genre</h2>
            <a href="/dashboard" style={{ fontSize: '13px', color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>
              View Dashboard →
            </a>
          </div>

          {/* Genre chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
            {GENRES.map(g => (
              <a
                key={g.id}
                href={`#genre-${g.id}`}
                onClick={e => {
                  e.preventDefault()
                  document.getElementById(`genre-${g.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600,
                  padding: '7px 18px', borderRadius: '20px', textDecoration: 'none',
                  cursor: 'pointer', transition: 'all 0.2s', display: 'inline-block'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.18)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.5)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
              >
                {g.emoji} {g.name}
              </a>
            ))}
          </div>

          {/* Genre rows */}
          {GENRES.map(g => <GenreRow key={g.id} genre={g} />)}
        </div>

        <div style={{ height: '60px' }} />
      </div>

      {/* ── Inline styles for genre rows ── */}
      <style>{`
        .mini-card {
          position: relative;
          flex-shrink: 0;
          width: 140px;
          cursor: pointer;
        }
        .mini-card-img {
          position: relative;
          width: 140px;
          height: 200px;
          border-radius: 8px;
          overflow: hidden;
          background: #1a1a2e;
        }
        .mini-card-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .mini-card-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          color: rgba(255,255,255,0.2);
        }
        .mini-card-score {
          position: absolute;
          top: 5px;
          right: 5px;
          background: rgba(0,0,0,0.7);
          color: #ffd700;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .mini-card-info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(3,0,20,0.97) 0%, transparent 100%);
          padding: 20px 8px 8px;
          border-radius: 0 0 8px 8px;
        }
        .mini-card-title {
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mini-card-year {
          font-size: 10px;
          color: rgba(255,255,255,0.5);
          margin: 2px 0 0;
        }
        .genre-row-wrap {
          margin-bottom: 40px;
        }
        .genre-row-title {
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }
        .genre-see-all {
          font-size: 13px;
          color: #a78bfa;
          text-decoration: none;
          font-weight: 600;
        }
        .genre-see-all:hover { text-decoration: underline; }
        .genre-row-outer {
          position: relative;
        }
        .genre-row-scroll {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          padding: 8px 0 12px;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .genre-row-scroll::-webkit-scrollbar { display: none; }
        .genre-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 5;
          background: rgba(3,0,20,0.88);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
          font-size: 26px;
          width: 36px;
          height: 64px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .genre-arrow:hover { background: rgba(108,99,255,0.5); }
        .genre-arrow.left  { left: -18px; }
        .genre-arrow.right { right: -18px; }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  )
}

export default App