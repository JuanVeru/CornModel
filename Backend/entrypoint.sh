#!/bin/sh

# If DATABASE_URL is set, block until the database port is active
if [ -n "$DATABASE_URL" ]; then
  echo "[*] Waiting for PostgreSQL database to become available..."
  python -c "
import sys, time, urllib.parse, psycopg2
url = urllib.parse.urlparse('$DATABASE_URL')
for i in range(30):
    try:
        conn = psycopg2.connect(
            dbname=url.path[1:],
            user=url.username,
            password=url.password,
            host=url.hostname,
            port=url.port or 5432
        )
        conn.close()
        print('[*] PostgreSQL database is ready!')
        sys.exit(0)
    except Exception as e:
        print(f'[*] Attempt {i+1}/30: Database not ready yet, retrying in 2 seconds...')
        time.sleep(2)
sys.exit(1)
"
fi

echo "[*] Database is reachable. Running Alembic migrations..."
alembic upgrade head

echo "[*] Starting FastAPI application server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
