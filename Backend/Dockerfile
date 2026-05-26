FROM python:3.10-slim

WORKDIR /workspace

# Install system dependencies required for building Python modules (like psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase and Keras model file
COPY . .

# Make entrypoint script executable
RUN chmod +x entrypoint.sh

# Expose port
EXPOSE 8000

# Set entrypoint execution script
ENTRYPOINT ["./entrypoint.sh"]
