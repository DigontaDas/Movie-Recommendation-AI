import React from 'react'

// const person = {
//     name: "Bruce",
//     age: 40,
//     location: "Gotham City"
// }

// const { name, age, location } = person


const Search = ({ searchTerm, setSearchTerm }) => {
  return (
    <div className='search'>
        <div>
            <img src="search.svg" alt="search" />

            <input 
            type="text"
            placeholder='search through lots of movies'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
    </div>
  )
}

export default Search