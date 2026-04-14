from pathlib import Path
from movie_recommender.data.movielens_loader import (
    MovieLensPaths,
    load_movielens,
    validate_movielens,
    default_movielens_root,
)

def main():
    repo_root = Path(__file__).resolve().parents[1]
    ml_root = default_movielens_root(repo_root)

    movies, ratings, links, tags = load_movielens(MovieLensPaths(ml_root))
    validate_movielens(movies, ratings, links)

    print("MovieLens loaded")
    print("movies:", movies.shape)
    print("ratings:", ratings.shape)
    print("links:", links.shape)
    print("tags:", tags.shape)
    print("\nSample movies:")
    print(movies.head(3))

if __name__ == "__main__":
    main()