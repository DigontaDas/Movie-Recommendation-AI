import { Client, Databases, Query, ID } from 'appwrite'

const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;

const client = new Client()
    // appwrite server
    .setEndpoint('https://cloud.appwrite.io/v1')
    // project
    .setProject(PROJECT_ID)

const database = new Databases(client)

// user searches a movie, and the movie that alongs with the searh term
export const updateSearchCount = async(searchTerm, movie) => {
    // console.log(PROJECT_ID, DATABASE_ID, COLLECTION_ID)

// things this function have to do:

        // 1. use appwrite SDK/API to check if the search term
            // already exists in the db
    try {
        const result = await database.listDocuments(DATABASE_ID, COLLECTION_ID, [
            // we are matching what we have in db with what our users are searching for
            Query.equal('searchTerm', searchTerm),
        ])

        // 2. if it does, update the count
        if (result.documents.length > 0) {
            const doc = result.documents[0]

            await database.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, {
                count: doc.count + 1
            })
        }
        // 3. if it doesn't, create a new document with the 
        // search term and count as 1 
        else{
            await database.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
                // this is very very important. Wasted my 1.5h on this shit because missed a dot in movie.id 
                searchTerm,
                count: 1,
                movie_id: movie.id,
                poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            })
        }

    } catch (error) {
        console.log(error)
    }
    
    
}

export const getTrendingMovies = async() => {
    try {
        const result = await database.listDocuments(DATABASE_ID, COLLECTION_ID, [
            Query.limit(5),
            Query.orderDesc("count")
        ])
        return result.documents;
        
    } catch (error) {
        console.log(error)
    }
}