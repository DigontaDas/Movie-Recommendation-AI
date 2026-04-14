import React, {useState, useEffect} from 'react'
import Search from './components/Search'
import Spinner from './components/Spinner'
import MovieCard from './components/MovieCard'
import { useDebounce } from 'react-use'
import { getTrendingMovies, updateSearchCount } from './appwrite'
// import { Client, Databases, Query, ID } from 'appwrite'
import { Client, Databases, Query, ID } from 'appwrite'
import { useRecommendations } from './hooks/useRecommendations';

const API_BASE_URL = 'https://api.themoviedb.org/3'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY
const API_OPTIONS = {
  method: `GET`,
  headers: {
    accept: `application/json`,
    Authorization: `Bearer ${API_KEY}`
  }
}

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  // in state if we want to change the value,
  // we don't do it to the variable
  // we do it to the method -> 'set___'
  const [errorMessage, setErrorMessage] = useState('')
  const [movieList, setMovieList] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [trendingMovies, setTrendingMovies] = useState([])
  const [aiPrompt, setAiPrompt] = useState("");
  const { recommendations, loading: aiLoading, error: aiError, search: triggerAiSearch } = useRecommendations();

  // Debounce the search term to prevent making too many API requests
  // by waiting for the user to stop typing for 500ms
  useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, 
  [searchTerm])

  const fetchMovies = async (query = '') => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const endpoint = query 
      ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
      : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;
      
      const response = await fetch(endpoint, API_OPTIONS);

      // alert(response);
      // throw new Error('Failed to fetch movies');

      if(!response.ok) {
        throw new Error('Failed to fetch movies');
      }
      const data = await response.json();
      // console.log(data)
      
      if(data.Response === 'False'){
        setErrorMessage(data.Error || 'Failed to fetch movies')
        setMovieList([])
        return;
      }
      setMovieList(data.results || [])

      // updateSearchCount()

      if(query && data.results.length > 0){
        await updateSearchCount(query, data.results[0]);
      }

    } catch (error) {
      console.error(`Error fetching movies: ${error}`);
      setErrorMessage(`Error fetching movies. Please try agian later.`);
    } finally {
      setIsLoading(false)
    }
  }

  const loadTrendingMovies = async () => {
    try {
      const movies = await getTrendingMovies()
      setTrendingMovies(movies)

    } catch (error) {
      console.log(`Error fetching trending movies: ${error}`)
    }
  }

  // it will be called everytime when debounce happens as it is the dependency
  useEffect(() => {
    fetchMovies(debouncedSearchTerm)
  }, [debouncedSearchTerm])
  // it will only get called at the start because there is no dependency
  useEffect(() => {
    loadTrendingMovies()
  }, [])
  

  return (
    <main>
      <div className='pattern' />

      <div className='wrapper'>
        <nav className='nav-link flex justify-center items-center space-x-2 py-4'>
          <img className="w-14 h-14" src="./ilogo.png" alt="Logo" />
          <h2 className='text-4xl font-bold'>CineBuzz</h2>
        </nav>

        <header>
          <img src='./hero-img.png' alt='Hero Banner'/>
          <h1>Find <span className='text-gradient'>Movies</span> You'll Enjoy</h1>
          <h2 className='flex justify-center items-center'>Right In Your Grasp</h2>
        <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </header>

        {trendingMovies.length > 0 && (
          <section className='trending mt-[150px] mb-[60px]'>
            <h2 className='mb-2'>Trending Movies</h2>

            <ul>
              {trendingMovies.map((movie, index) => (
                <li key={movie.$id}>
                  <p>{index + 1}</p>
                  <img src={movie.poster_url} 
                       alt={movie.title}
                       className="h-[180px] w-[126px] rounded-lg object-cover" />
                </li>
              ))}
            </ul>
          </section>
          
        )}

        <section className='ai-magic mt-[60px] mb-[60px]'>
          <h2 className='mb-4 text-3xl font-bold'>✨ AI Vibe Match</h2>
          <p className='text-gray-400 mb-6'>Don't know the title? Describe the vibe, plot, or feeling you want.</p>
          
          <div className='search mb-8 flex items-center'>
            <div className="flex-grow flex items-center bg-gray-800 rounded-lg px-4 py-2 border border-gray-700">
              <img src="./search.svg" alt="search" className="w-5 h-5 mr-3" />
              <input
                type='text'
                className="bg-transparent text-white outline-none w-full"
                placeholder="e.g. 'A mind-bending thriller that makes me question reality'"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && triggerAiSearch(aiPrompt)}
              />
            </div>
            <button
              onClick={() => triggerAiSearch(aiPrompt)}
              disabled={aiLoading}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 transition ml-4 disabled:opacity-50"
            >
              {aiLoading ? 'Thinking...' : 'Ask AI'}
            </button>
          </div>

          {/* AI Results Display */}
          {aiLoading ? (
            <Spinner />
          ) : aiError ? (
            <p className='text-red-500 text-center'>{aiError}</p>
          ) : recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations.map((movie) => (
                <div key={movie.rank} className="bg-gray-800 rounded-xl p-4 flex gap-4 border border-gray-700 shadow-lg">
                   {movie.poster_url ? (
                       <img src={movie.poster_url} alt={movie.title} className="w-24 h-36 object-cover rounded-md" />
                   ) : (
                       <div className="w-24 h-36 bg-gray-700 rounded-md flex justify-center items-center text-xs text-gray-400 text-center p-2">No Poster Available</div>
                   )}
                   <div className="flex flex-col justify-center">
                      <h3 className="text-xl font-bold text-white mb-1">
                        {movie.title} <span className="text-sm text-gray-400 font-normal">({movie.year || "N/A"})</span>
                      </h3>
                      <p className="text-sm text-purple-400 font-semibold mb-2">{movie.genre || "Unknown Genre"}</p>
                      <p className="text-sm text-gray-300 italic">"{movie.reason}"</p>
                   </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
        <section className='all-movies'>
          <h2>All Movies</h2>

          {isLoading ? (
            // <p className='text-white'>Loading ...</p>
            <Spinner />
          ) : errorMessage ? (
            <p className='text-red-500'>{errorMessage}</p>
          ) : (
            <ul>{movieList.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}</ul>
          )}
          {errorMessage && <p className='text-red-500'>{errorMessage}</p>}
        </section>

      </div>
    </main>
  )
}

export default App