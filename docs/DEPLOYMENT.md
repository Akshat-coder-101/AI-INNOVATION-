# Deployment Guide

## 1. Quick Local Boot

### Backend (FastAPI)
```bash
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (Next.js 15)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 2. Cloud Deployment

- **Frontend:** Vercel (`frontend` root directory)
- **Backend:** Render / Fly.io / Railway using `Dockerfile` or Python runtime command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Database:** Supabase PostgreSQL with `pgvector` extension enabled.
