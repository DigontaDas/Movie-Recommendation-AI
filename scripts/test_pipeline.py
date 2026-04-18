from movie_recommender.recommender.pipeline import run_pipeline

query = "funny animated family movie"

results = run_pipeline(query)

print("\nTop results:\n")

for r in results:
    print(f"{r['title']} ({r['year']})")
    print("Reason:", r["reason"])
    print("-" * 50)