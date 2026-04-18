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
          <a href="/ai" className="ml-6 text-sm text-purple-400 font-semibold hover:text-purple-300 transition-colors flex items-center gap-1">
            ✨ AI Picks
          </a>
          <h2 className='text-4xl font-bold'>Movie Man</h2>
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