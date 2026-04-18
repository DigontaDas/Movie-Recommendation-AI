/**
 * frontend/src/pages/Dashboard.jsx
 * 
 * Shows:
 *  - AI Search History (from your FastAPI /history endpoint)
 *  - Genre quick-links
 *  - Watchlist placeholder (Mihir will wire this to user profile later)
 */
import React, { useState, useEffect } from 'react'
import Spinner from '../components/Spinner'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'

const GENRES = [
  { id: 28,    name: 'Action',    emoji: '💥', color: '#ff4444' },
  { id: 35,    name: 'Comedy',    emoji: '😂', color: '#ffb300' },
  { id: 18,    name: 'Drama',     emoji: '🎭', color: '#7c4dff' },
  { id: 27,    name: 'Horror',    emoji: '👻', color: '#37474f' },
  { id: 878,   name: 'Sci-Fi',    emoji: '🚀', color: '#0288d1' },
  { id: 10749, name: 'Romance',   emoji: '❤️', color: '#e91e63' },
  { id: 53,    name: 'Thriller',  emoji: '🔪', color: '#5d4037' },
  { id: 16,    name: 'Animation', emoji: '🎨', color: '#26a69a' },
  { id: 80,    name: 'Crime',     emoji: '🕵️', color: '#455a64' },
  { id: 12,    name: 'Adventure', emoji: '🗺️', color: '#558b2f' },
]

function AIHistoryCard({ item }) {
  return (
    <div style={{
      background: '#0f0d23', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px', padding: '16px', cursor: 'pointer',
      transition: 'all 0.2s', marginBottom: '12px'
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.5)'; e.currentTarget.style.background = '#130f2e' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = '#0f0d23' }}
      onClick={() => window.location.href = `/?ai=1&q=${encodeURIComponent(item.query_text)}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0, flex: 1, paddingRight: '12px' }}>
          ✨ {item.query_text}
        </p>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {new Date(item.created_at).toLocaleDateString()}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '8px', overflow: 'hidden' }}>
        {item.recommendations?.slice(0, 5).map((rec, i) => (
          <div key={i} style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{ width: '44px', height: '60px', borderRadius: '6px', overflow: 'hidden', background: '#1a1a2e', marginBottom: '3px' }}>
              {rec.poster_url
                ? <img src={rec.poster_url} alt={rec.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🎬</div>
              }
            </div>
          </div>
        ))}
        {item.recommendations?.length > 5 && (
          <div style={{ flexShrink: 0, width: '44px', height: '60px', borderRadius: '6px', background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#a78bfa', fontWeight: 700 }}>
            +{item.recommendations.length - 5}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState(null)
  const [tmdbTrending, setTmdbTrending] = useState([])

  useEffect(() => {
    // Load AI history
    fetch(`${API_BASE}/history?limit=20`)
      .then(r => r.json())
      .then(data => { setHistory(data); setHistoryLoading(false) })
      .catch(e => { setHistoryError('Could not load AI history. Is your backend running?'); setHistoryLoading(false) })

    // Load TMDB trending for stats
    if (TMDB_KEY) {
      fetch(`${TMDB_BASE}/trending/movie/week`, {
        headers: { accept: 'application/json', Authorization: `Bearer ${TMDB_KEY}` }
      })
        .then(r => r.json())
        .then(d => setTmdbTrending(d.results?.slice(0, 6) || []))
        .catch(() => {})
    }
  }, [])

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
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Page title ── */}
        <div style={{ marginBottom: '36px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 6px', textAlign: 'left', maxWidth: 'none' }}>
            Dashboard
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: 0 }}>
            Your AI search history, genres, and watchlist in one place.
          </p>
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px', marginBottom: '40px' }}>
          {[
            { label: 'AI Searches', value: history.length, icon: '✨', color: '#6c63ff' },
            { label: 'Movies Explored', value: history.reduce((a, h) => a + (h.recommendations?.length || 0), 0), icon: '🎬', color: '#a78bfa' },
            { label: 'Genres Available', value: GENRES.length, icon: '🎭', color: '#f59e0b' },
            { label: 'Watchlist', value: '—', icon: '📌', color: '#10b981', note: 'Coming soon' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#0f0d23', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px', padding: '20px 18px'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{stat.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{stat.label}</div>
              {stat.note && <div style={{ fontSize: '10px', color: '#10b981', marginTop: '4px' }}>{stat.note}</div>}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '28px', alignItems: 'start' }}>

          {/* ── Left: AI History ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>✨ AI Search History</h2>
              <a href="/?ai=1" style={{ fontSize: '13px', color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>
                New AI Search →
              </a>
            </div>

            {historyLoading && <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}><Spinner /> Loading history…</div>}

            {historyError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '14px', borderRadius: '10px', fontSize: '13px' }}>
                ⚠️ {historyError}
              </div>
            )}

            {!historyLoading && !historyError && history.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: '#0f0d23', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: '0 0 16px' }}>No AI searches yet.</p>
                <a href="/?ai=1" style={{
                  background: 'linear-gradient(135deg,#6c63ff,#a78bfa)', color: '#fff',
                  padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                  textDecoration: 'none', display: 'inline-block'
                }}>Try AI Search</a>
              </div>
            )}

            {!historyLoading && history.map(item => (
              <AIHistoryCard key={item.query_id} item={item} />
            ))}
          </div>

          {/* ── Right: Genres + Watchlist ── */}
          <div>
            {/* Genre quick-links */}
            <div style={{ background: '#0f0d23', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 14px' }}>🎭 Browse Genres</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {GENRES.map(g => (
                  <a key={g.id} href={`/genre/${g.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: `${g.color}18`, border: `1px solid ${g.color}30`,
                      borderRadius: '10px', padding: '9px 12px', textDecoration: 'none',
                      fontSize: '13px', color: '#fff', fontWeight: 600, transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${g.color}30`; e.currentTarget.style.borderColor = `${g.color}60` }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${g.color}18`; e.currentTarget.style.borderColor = `${g.color}30` }}
                  >
                    <span>{g.emoji}</span> {g.name}
                  </a>
                ))}
              </div>
            </div>

            {/* Watchlist placeholder */}
            <div style={{ background: '#0f0d23', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>📌 My Watchlist</h3>
                <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  COMING SOON
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 12px', lineHeight: 1.5 }}>
                Save movies to watch later. Mihir is building individual movie pages — your watchlist will live there.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', opacity: 0.35 }}>
                {tmdbTrending.slice(0, 6).map(m => (
                  <div key={m.id} style={{ aspectRatio: '2/3', borderRadius: '6px', overflow: 'hidden', background: '#1a1a2e' }}>
                    {m.poster_path && <img src={`${TMDB_IMG}${m.poster_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}