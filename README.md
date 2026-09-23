# KnowFlow

A full-stack AI Knowledge & Research Platform, built progressively from a standard CRUD app into a document platform with LLM-powered features (summarization, and RAG/agents/MCP to come).

## Tech Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend:** Python + FastAPI
- **Database:** PostgreSQL (via SQLAlchemy ORM)
- **Object Storage:** MinIO (S3-compatible)
- **LLM:** Anthropic Claude API
- **Auth:** JWT access + refresh tokens

## Features

- User authentication (register, login, JWT refresh flow)
- Workspaces → Collections → Documents hierarchy, each with full CRUD
- Standalone Notes per workspace, with a Mac-Notes-style autosaving editor
- Document upload with type/size validation, inline preview (PDF/text), full-text search, and version history
- AI-generated document summaries (Claude API)
- Dark/light theme support

## Architecture Notes

The backend follows a layered structure — `models` (SQLAlchemy), `schemas` (Pydantic request/response contracts), `services` (business logic), `repositories` (data-access, behind `Protocol` interfaces for swappable implementations), and `api` (FastAPI routes). Storage (MinIO) and the LLM provider (Anthropic) are both accessed through Protocol-based abstractions, so either could be swapped for an alternative (e.g. AWS S3, a different LLM provider) without touching route logic.

## Prerequisites

- Python 3.12+
- Node.js 18+
- Docker Desktop
- PostgreSQL (via pgAdmin or any client)
- An [Anthropic API key](https://console.anthropic.com)

## Setup

### 1. Clone and set up the database
```bash
git clone <this-repo-url>
cd "Know Flow"
```
Create a PostgreSQL database (e.g. `Knowflow`) and run the schema found in `backend/schema.sql` against it.

### 2. Start MinIO (object storage)
```bash
docker run -d \
  --name knowflow-minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=your_minio_user" \
  -e "MINIO_ROOT_PASSWORD=your_minio_password" \
  -v ~/minio-data:/data \
  quay.io/minio/minio server /data --console-address ":9001"
```
Open `http://localhost:9001`, log in, and create a bucket named `knowflow-documents`.

### 3. Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then fill in your real values
uvicorn app.main:app --reload
```
Backend runs at `http://localhost:8000` (Swagger docs at `/docs`).

### 4. Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```
Frontend runs at `http://localhost:3000`.

## Environment Variables

See `backend/.env.example` and `frontend/.env.local.example` for the full list of required variables and their expected format.

## Roadmap

This project follows a phased build-out from full-stack foundation → RAG → agents → MCP → evaluation → production deployment. See `KnowFlow_Full_Stack_LLM_Roadmap.md` for the complete plan and current progress.

## License

See [LICENSE](./LICENSE).