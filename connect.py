import os
import pathlib
import pandas as pd

base = os.path.join("movielens_data", "ml-latest-small")

movies_df  = pd.read_csv(os.path.join(base, "movies.csv"))
ratings_df = pd.read_csv(os.path.join(base, "ratings.csv"))
tags_df    = pd.read_csv(os.path.join(base, "tags.csv"))

# Clean title and extract year
movies_df["year"]  = movies_df["title"].str.extract(r"\((\d{4})\)$")[0].astype("Int64")
movies_df["clean_title"] = movies_df["title"].str.replace(r"\s*\(\d{4}\)$", "", regex=True).str.strip()

# genres_str — replace | with comma
movies_df["genres_str"] = movies_df["genres"].str.replace("|", ", ", regex=False)

# Tags aggregation
tags_df["tag"] = tags_df["tag"].str.lower()
tag_agg = tags_df.groupby("movieId")["tag"].apply(lambda x: " ".join(x.unique())).reset_index()
tag_agg.columns = ["movieId", "tags_text"]
movies_df = movies_df.merge(tag_agg, on="movieId", how="left")
movies_df["tags_text"] = movies_df["tags_text"].fillna("")

# Rating stats
rating_stats = ratings_df.groupby("movieId")["rating"].agg(
    avg_rating="mean",
    num_ratings="count"
).reset_index()
movies_df = movies_df.merge(rating_stats, on="movieId", how="left")
movies_df["avg_rating"]  = movies_df["avg_rating"].fillna(0.0).round(2)
movies_df["num_ratings"] = movies_df["num_ratings"].fillna(0).astype(int)

# Filter movies with less than 5 ratings
movies_df = movies_df[movies_df["num_ratings"] >= 5]

# text_blob — what gets embedded
movies_df["text_blob"] = movies_df.apply(
    lambda r: f"{r['clean_title']} [{r['year']}] Genres: {r['genres_str']}. Tags: {r['tags_text']}".strip(),
    axis=1
)

# Save to parquet
pathlib.Path("data/processed").mkdir(parents=True, exist_ok=True)
movies_df.to_parquet("data/processed/movies_processed.parquet", index=False)

print(f"Movies : {len(movies_df)}")
print(f"Ratings: {len(ratings_df)}")
print(f"Tags   : {len(tags_df)}")
print(f"Saved to data/processed/movies_processed.parquet ✅")
print(movies_df[["clean_title", "year", "genres_str", "tags_text", "text_blob"]].head(3))