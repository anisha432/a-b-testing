# ExperimentIQ

### AI-Powered A/B Testing & Experimentation Intelligence Platform

A production-grade experimentation platform that helps product, marketing, growth, and data teams create, analyze, and optimize A/B tests with rigorous statistical methods.

---

## Key Features

- **Experiment Management** — Create, configure, and track experiments with hypotheses, traffic allocation, and status workflows
- **Data Lab** — Upload CSV datasets, auto-detect schemas, validate data quality, and map columns to experiment roles
- **Statistical Engine** — Z-tests, t-tests, Mann-Whitney U, chi-square with confidence intervals, power analysis, and MDE
- **SRM Detection** — Automatic Sample Ratio Mismatch detection with severity levels
- **Segment Analysis** — Break down results by device, country, channel, or custom segments
- **Business Impact** — Convert statistical results into revenue impact estimates
- **Experiment Copilot** — Ask natural language questions about experiment results
- **PDF Reports** — Generate professional experiment reports using ReportLab
- **Monitoring Center** — Real-time experiment health, alerts, and data freshness tracking
- **Health Checks** — Automated experiment quality scoring across 6+ dimensions

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts, React Router, TanStack Query |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.x, Pydantic v2, Alembic |
| Database | PostgreSQL 16 |
| Analytics | pandas, NumPy, SciPy, statsmodels, scikit-learn |
| PDF Reports | ReportLab |
| Infrastructure | Docker, Docker Compose, Nginx |

---

## Architecture

```
ExperimentIQ/
├── backend/          # FastAPI application
│   ├── app/
│   │   ├── api/      # REST API endpoints
│   │   ├── core/     # Configuration, security
│   │   ├── db/       # Database session
│   │   ├── models/   # SQLAlchemy ORM models
│   │   ├── schemas/  # Pydantic request/response schemas
│   │   ├── analytics/# Statistical engine
│   │   └── services/ # Business logic (PDF reports)
│   └── alembic/      # Database migrations
├── frontend/         # React SPA
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Page components
│       ├── layouts/     # App layout with sidebar
│       ├── hooks/       # Custom React hooks
│       ├── services/    # API client
│       ├── types/       # TypeScript definitions
│       └── lib/         # Utilities
├── scripts/          # Seed data, utilities
├── docker-compose.yml
└── Makefile
```

---

## Statistical Methodology

| Metric Type | Test Used | When |
|------------|----------|------|
| Binary conversion | Two-proportion z-test | Conversion rates, click-through rates |
| Continuous (normal) | Welch's t-test | Session counts, time-on-page (if normal) |
| Continuous (non-normal) | Mann-Whitney U | Revenue, skewed metrics |
| Traffic allocation | Chi-square goodness-of-fit | SRM detection |

All tests include:
- Confidence intervals at configurable levels
- Statistical power analysis
- Minimum detectable effect (MDE) calculation
- Effect size estimation

---

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL 14+

### Development Setup

```bash
# Clone the repository
git clone <repo-url>
cd ExperimentIQ

# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create database
createdb experimentiq

# Run migrations
alembic upgrade head

# Seed demo data
python -c "from scripts.seed import seed; seed()"

# Start backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Docker Setup

```bash
docker-compose up -d --build

# Seed demo data
docker-compose exec backend python -c "from scripts.seed import seed; seed()"
```

### Login

- **Email:** admin@experimentiq.com
- **Password:** admin123

---

## Environment Variables

| Variable | Description | Default |
|----------|------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://experimentiq:experimentiq@localhost:5432/experimentiq` |
| `JWT_SECRET` | JWT signing secret | (must be set in production) |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |
| `VITE_API_URL` | Frontend API base URL | (empty = proxy) |
| `PORT` | Server port | `8000` |

---

## API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register` | POST | Register new user |
| `/api/v1/auth/login` | POST | Login |
| `/api/v1/auth/me` | GET | Get current user |
| `/api/v1/experiments` | GET/POST | List/create experiments |
| `/api/v1/experiments/:id` | GET/PUT/DELETE | Experiment CRUD |
| `/api/v1/datasets/upload` | POST | Upload CSV dataset |
| `/api/v1/datasets/:id/quality` | GET | Data quality analysis |
| `/api/v1/analytics/run/:id` | POST | Run statistical analysis |
| `/api/v1/analytics/overview` | GET | Dashboard overview |
| `/api/v1/analytics/copilot` | POST | Ask experiment questions |
| `/api/v1/reports` | GET/POST | List/generate reports |
| `/api/v1/reports/:id/download` | GET | Download PDF report |

---

## Database Schema

- **users** — User accounts with authentication
- **workspaces** — Team workspaces
- **experiments** — Experiment definitions with hypotheses
- **experiment_variants** — Control/Treatment variants with allocation
- **datasets** — Uploaded CSV datasets with quality scores
- **dataset_columns** — Column metadata and mapping
- **experiment_results** — Statistical analysis results
- **segment_results** — Segment-level analysis
- **experiment_alerts** — Health alerts and warnings
- **reports** — Generated PDF reports
- **activities** — Audit log

---

## Testing

```bash
# Backend tests
cd backend && python -m pytest tests/ -v

# Frontend build check
cd frontend && npm run build
```

---

## Deployment

### Render

1. Create a PostgreSQL database
2. Deploy backend as a Web Service
3. Deploy frontend as a Static Site
4. Set environment variables in Render dashboard

### Docker

```bash
docker-compose -f docker-compose.yml up -d --build
```

---

## License

MIT
