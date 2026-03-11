import os
import pandas as pd


# ── LOAD ALL MOVIELENS FILES ─────────────────────────────────────────────────
base = os.path.join("movielens_data", "ml-latest-small")

movies_df  = pd.read_csv(os.path.join(base, "movies.csv"))   # movieId, title, genres
ratings_df = pd.read_csv(os.path.join(base, "ratings.csv"))  # userId, movieId, rating
tags_df    = pd.read_csv(os.path.join(base, "tags.csv"))      # userId, movieId, tag
years_df= movies_df["title"].str.extract(r"\((\d{4})\)$")  # Extract year from title
movies_df["year"] = years_df[0].astype("Int64")  # Add year column to movies_df
movies_df["title"] = movies_df["title"].str.replace(r"\s*\(\d{4}\)$", "", regex=True)  # Remove year from title

tags_df["tag"] = tags_df["tag"].str.lower()  # Convert tags to lowercase for consistency
tag_agg= tags_df.groupby(tags_df["movieId"])["tag"].apply(lambda x: ", ".join(x.unique()))  # Group tags by movieId and join them into a single string
tag_agg = tag_agg.reset_index()
tag_agg.columns = ["movieId", "tag_description"]
movies_df=movies_df.merge(tag_agg,on="movieId",how="left")
print(tag_agg.head())
print(f"Movies : {len(movies_df)}")
print(f"Ratings: {len(ratings_df)}")
print(f"Tags   : {len(tags_df)}\n")