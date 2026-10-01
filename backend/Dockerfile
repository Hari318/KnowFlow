FROM python:3.12-slim

# Makes print()/logging show up immediately in the container's logs instead of
# being buffered — matters for actually seeing what's happening on Render's log viewer
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# gcc + libpq-dev: some Python packages (like psycopg2, if you're not using the
# -binary variant) need to compile C extensions against Postgres's client library
# at install time. Without these, `pip install` would fail inside the container
# even though it worked fine on your Mac (where these were already present).
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy ONLY requirements.txt first, install, THEN copy the rest of the code.
# This is a deliberate ordering trick: Docker caches each instruction as a
# "layer". If you copied all your code first, then changing one line of
# app.py would invalidate the cache and force a full pip reinstall on every
# build. By copying requirements.txt first, that install layer stays cached
# and reused as long as your dependencies haven't changed — code-only
# changes rebuild in seconds instead of minutes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# 0.0.0.0 (not 127.0.0.1/localhost) means "listen on every network interface".
# Inside a container, binding to just localhost would make the server
# unreachable from outside the container — Render/Docker couldn't route
# traffic to it. This is a very common first-timer Docker bug.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]