FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download embedding model
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

# Copy source code
COPY src ./src
COPY scripts ./scripts
COPY data ./data

# Install the package or just add to PYTHONPATH
ENV PYTHONPATH=/app:/app/src

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "movie_recommender.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
