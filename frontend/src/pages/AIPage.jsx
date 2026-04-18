import React, { useState, useEffect, useRef } from 'react'
import Spinner from '../components/Spinner'
import { useRecommendations } from '../hooks/useRecommendations'

const SUGGESTIONS = [
  "Mind-bending sci-fi thriller like Inception",
  "Feel-good comedy for a lazy Sunday",
  "Dark psychological drama with plot twists",
  "Epic fantasy adventure with great world-building",
  "Emotional family movie that'll make me cry",
  "Fast-paced action with great stunts",
]

const GENRES = ["All", "Action", "Comedy", "Drama", "Thriller", "Sci-Fi", "Horror", "Romance", "Crime", "Animation"]

function AIMovieCard({ movie, index }) {
  const [imgError, setImgError] = useState(false)
  const poster = !imgError && movie.poster_url ? movie.poster_url : null

  return (
    <div
      className="bg-dark-100 rounded-2xl overflow-hidden shadow-inner shadow-light-100/10 border border-light-100/10 hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-purple-500/20 hover:shadow-lg cursor-pointer"
      style={{ animationDelay: `${index * 0.06}s`, animation: 'fadeSlideUp 0.45s ease both' }}
    >
      <div className="relative overflow-hidden" style={{ height: 260 }}>
        {poster ? (
          <img
            src={poster}
            alt={movie.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center gap-2">
            <span style={{ fontSize: 36 }}>🎬</span>
            <p className="text-gray-500 text-xs text-center px-3">{movie.title}</p>
          </div>
        )}
        <div className="absolute top-2 left-2 bg-purple-600/90 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm">
          #{movie.rank}
        </div>
        {movie.score != null && (
          <div className="absolute top-2 right-2 bg-black/60 text-yellow-400 text-xs font-bold px-2 py-1 rounded-md border border-yellow-400/30">
            ★ {(movie.score * 10).toFixed(1)}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-white font-bold text-sm mb-1 line-clamp-1">{movie.title}</h3>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {movie.year && <span className="text-gray-400 text-xs">{movie.year}</span>}
          {movie.genre && (
            <span className="text-purple-400 text-xs bg-purple-500/10 px-2 py-0.5 rounded-full">
              {movie.genre}
            </span>
          )}
        </div>
        {movie.reason && (
          <p className="text-gray-300 text-xs italic leading-relaxed line-clamp-3">"{movie.reason}"</p>
        )}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-dark-100 rounded-2xl overflow-hidden border border-light-100/5 animate-pulse">
      <div className="bg-gray-800" style={{ height: 260 }} />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-gray-700 rounded-full w-4/5" />
        <div className="h-3 bg-gray-800 rounded-full w-2/5" />
        <div className="h-3 bg-gray-800 rounded-full w-full" />
        <div className="h-3 bg-gray-800 rounded-full w-3/5" />
      </div>
    </div>
  )
}

export default function AIPage() {
  const [query, setQuery]             = useState('')
  const [activeGenre, setActiveGenre] = useState('All')
  const [showSugg, setShowSugg]       = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [topK, setTopK]               = useState(10)

  const { recommendations, history, loading, error, search, fetchHistory } = useRecommendations()
  const inputRef   = useRef(null)
  const resultsRef = useRef(null)

  useEffect(() => { fetchHistory(8) }, [])

  const handleSearch = async (q = query) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setHasSearched(true)
    setShowSugg(false)
    setActiveGenre('All')
    await search(trimmed, topK)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
  }

  const filteredResults = activeGenre === 'All'
    ? recommendations
    : recommendations.filter(m => m.genre?.toLowerCase().includes(activeGenre.toLowerCase()))

  return (
    <div className="min-h-screen relative" style={{ background: '#030014' }}>
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(108,99,255,0.15) 0%, transparent 70%)' }}
      />

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .line-clamp-1 { display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden; }
        .line-clamp-3 { display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden; }
        .sugg-item:hover { background: rgba(108,99,255,0.15); color: #fff; }
      `}</style>

      <div className="wrapper relative z-10 pt-6">

        <a href="/" className="inline-flex items-center gap-2 text-light-200 hover:text-white transition-colors text-sm mb-8">
          ← Back to CineBuzz
        </a>

        {/* ── Hero ── */}
        <section className="text-center mb-10" style={{ animation: 'fadeSlideUp .4s ease both' }}>

          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.3)', color: '#a78bfa' }}>
            ✨ Powered by LLaMA 3.1 + ChromaDB
          </div>

          <h1 className="mb-4" style={{ fontSize: 'clamp(26px, 5vw, 52px)' }}>
            Describe a movie <span className="text-gradient">you're in the mood for</span>
          </h1>
          <p className="text-light-200 mb-8" style={{ maxWidth: 500, margin: '0 auto 2rem' }}>
            Our AI reads your vibe, searches 3,650+ films, and picks what you'll actually love.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[['🎯','Semantic Search'],['🤖','LLM Reranking'],['⚡','Instant Results'],['📜','Saves History']].map(([icon, label]) => (
              <span key={label} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full text-gray-100"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {icon} {label}
              </span>
            ))}
          </div>

          {/* ── Search box ── */}
          <div className="relative max-w-3xl mx-auto">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{
                background: 'rgba(206,206,251,0.05)',
                border: '1.5px solid rgba(108,99,255,0.45)',
                boxShadow: '0 0 0 4px rgba(108,99,255,0.06)',
              }}>
              <img src="/search.svg" alt="search" className="w-5 h-5 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                className="bg-transparent text-white outline-none w-full text-sm placeholder-light-200"
                placeholder="e.g. Dark psychological thriller with an unreliable narrator..."
                value={query}
                onChange={e => { setQuery(e.target.value); setShowSugg(e.target.value.length === 0) }}
                onFocus={() => query.length === 0 && setShowSugg(true)}
                onBlur={() => setTimeout(() => setShowSugg(false), 160)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <select
                value={topK}
                onChange={e => setTopK(+e.target.value)}
                className="text-gray-300 text-xs rounded-lg px-2 py-1.5 flex-shrink-0 cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                {[5,10,15,20].map(n => <option key={n} value={n}>{n} picks</option>)}
              </select>
              <button
                onClick={() => handleSearch()}
                disabled={loading || !query.trim()}
                className="flex-shrink-0 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #6c63ff, #a78bfa)' }}
              >
                {loading ? 'Thinking...' : 'Find Movies →'}
              </button>
            </div>

            {/* Suggestions */}
            {showSugg && (
              <div className="absolute left-0 right-0 z-50 rounded-xl overflow-hidden mt-2 text-left"
                style={{ background: 'rgba(15,13,35,0.98)', border: '1px solid rgba(108,99,255,0.2)', boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}>
                <p className="px-4 pt-3 pb-1 text-xs text-gray-500 uppercase tracking-widest font-semibold">Try asking…</p>
                {SUGGESTIONS.map(s => (
                  <div key={s} className="sugg-item px-4 py-2.5 text-sm text-gray-300 cursor-pointer flex items-center gap-3 transition-colors"
                    onMouseDown={() => { setQuery(s); setShowSugg(false); handleSearch(s) }}>
                    <span className="opacity-50">💡</span> {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History pills */}
          {history.length > 0 && !hasSearched && (
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              <span className="text-gray-500 text-xs self-center">Recent:</span>
              {history.slice(0, 5).map(item => (
                <button key={item.query_id}
                  onClick={() => { setQuery(item.query_text); handleSearch(item.query_text) }}
                  className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-full transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  🕐 {item.query_text.length > 28 ? item.query_text.slice(0,28)+'…' : item.query_text}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Genre filter ── */}
        {hasSearched && recommendations.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 hide-scrollbar" style={{ animation: 'fadeSlideUp .35s ease both' }}>
            {GENRES.map(g => (
              <button key={g} onClick={() => setActiveGenre(g)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                style={activeGenre === g
                  ? { background: 'linear-gradient(135deg,#6c63ff,#a78bfa)', color:'#fff', border:'1px solid transparent', boxShadow:'0 4px 14px rgba(108,99,255,0.35)' }
                  : { background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.55)', border:'1px solid rgba(255,255,255,0.08)' }
                }>{g}</button>
            ))}
          </div>
        )}

        {/* ── Results ── */}
        <section ref={resultsRef}>
          {error && (
            <div className="max-w-xl mx-auto mb-8 px-4 py-3 rounded-xl text-red-300 text-sm"
              style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)' }}>
              ⚠️ {error}
            </div>
          )}

          {loading && (
            <div>
              <div className="flex items-center justify-center gap-3 text-light-200 text-sm mb-6">
                <Spinner /><span>Searching 3,650 movies with AI…</span>
              </div>
              <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: topK }).map((_,i) => <SkeletonCard key={i} />)}
              </div>
            </div>
          )}

          {!loading && hasSearched && filteredResults.length > 0 && (
            <div style={{ animation: 'fadeSlideUp .4s ease both' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2>{filteredResults.length} AI picks for you</h2>
                  <p className="text-gray-400 text-sm mt-1">"{query}"</p>
                </div>
                <button onClick={() => { setHasSearched(false); setQuery(''); inputRef.current?.focus() }}
                  className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition-all"
                  style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}>
                  Clear ✕
                </button>
              </div>
              <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredResults.map((movie, i) => <AIMovieCard key={movie.rank} movie={movie} index={i} />)}
              </div>
            </div>
          )}

          {!loading && hasSearched && filteredResults.length === 0 && recommendations.length > 0 && (
            <div className="text-center py-16 text-gray-500">
              <div className="text-4xl mb-3">🎬</div>
              <p>No {activeGenre} movies in these results. Try a different genre.</p>
            </div>
          )}

          {!loading && !hasSearched && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-4">💡 Try these searches</p>
              <div className="flex flex-wrap gap-3">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => { setQuery(s); handleSearch(s) }}
                    className="text-left text-sm text-gray-300 px-4 py-3 rounded-xl transition-all hover:text-white"
                    style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', maxWidth:260 }}
                    onMouseEnter={e => { e.currentTarget.style.background='rgba(108,99,255,0.12)'; e.currentTarget.style.borderColor='rgba(108,99,255,0.3)' }}
                    onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)' }}>
                    🔮 {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="h-20" />
      </div>
    </div>
  )
}