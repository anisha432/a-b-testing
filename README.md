# ExperimentIQ

### AI-Powered A/B Testing & Experimentation Intelligence Platform

ExperimentIQ is a modern experimentation analytics platform designed to help product, marketing, growth, and data teams **create, analyze, monitor, and interpret A/B tests** using rigorous statistical methods and business-focused insights.

> Turn experiment data into statistically reliable decisions — from setup and data validation to analysis, segmentation, business impact, and reporting.

---

## 🚀 Live Demo

🔗 **[Try ExperimentIQ Live](https://a-b-testing-1.onrender.com)**

> Explore the complete A/B testing and experimentation workflow directly in the browser.


## ✨ Key Features

### 🧪 Experiment Management
- Create and configure A/B testing experiments
- Define hypotheses, descriptions, owners, and experiment types
- Configure control and treatment traffic allocation
- Track experiment lifecycle and status

### 📊 Data Lab
- Upload **CSV and Excel (`.xlsx` / `.xls`) datasets**
- Automatic schema and column detection
- Data quality validation
- Dataset profiling and experiment-role mapping
- Duplicate and data consistency checks

### 📈 Statistical Analysis
- Two-proportion Z-test for conversion metrics
- Welch's t-test for continuous metrics
- Mann–Whitney U test for non-normal distributions
- Chi-square goodness-of-fit test
- Confidence intervals
- Statistical significance and effect-size estimation
- Statistical power analysis
- Minimum Detectable Effect (MDE)

### ⚖️ SRM Detection
Automatically detects **Sample Ratio Mismatch (SRM)** between experiment variants and reports severity levels to help identify traffic allocation problems.

### 👥 Segment Analysis
Analyze experiment performance across:
- Device
- Country
- Channel
- Custom audience segments

### 💰 Business Impact
Translate statistical results into business-oriented outcomes such as:
- Estimated revenue impact
- Treatment uplift
- Conversion improvement
- Rollout recommendations

### 🤖 Experiment Copilot
Ask natural-language questions about experiment results and receive data-driven answers without manually navigating every analytics view.

### 💡 Insights
Automatically surfaces significant experiment outcomes and recommendations based on statistical results.

### 📄 PDF Reports
Generate professional experiment reports containing experiment configuration, statistical results, and business insights using ReportLab.

### 🩺 Experiment Health & Monitoring
- Experiment health scoring
- Data freshness monitoring
- Statistical quality checks
- Alerts and warnings
- Operational monitoring

---

## 🖥️ Application Modules

| Module | Purpose |
|---|---|
| **Overview** | High-level experimentation dashboard |
| **Experiments** | Create and manage A/B tests |
| **Data Lab** | Upload, inspect, and validate datasets |
| **Analytics** | Statistical experiment analysis |
| **Segments** | Segment-level performance analysis |
| **Business Impact** | Translate results into business value |
| **Insights** | Automated experiment recommendations |
| **Copilot** | Natural-language experiment analysis |
| **Monitor** | Experiment health and operational monitoring |
| **Reports** | Generate and download PDF reports |
| **Settings** | Application and account configuration |

---

## 🏗️ Architecture

```text
ExperimentIQ/
│
├── backend/
│   ├── app/
│   │   ├── api/          # REST API endpoints
│   │   ├── core/         # Configuration and security
│   │   ├── db/           # Database session and connection
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── analytics/    # Statistical analysis engine
│   │   └── services/     # Business logic and PDF reports
│   └── alembic/          # Database migrations
│
├── frontend/
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Application pages
│       ├── layouts/      # Application layouts
│       ├── hooks/        # Custom React hooks
│       ├── services/     # API client
│       ├── types/        # TypeScript types
│       └── lib/          # Utility functions
│
├── scripts/              # Seed data and utilities
├── docker-compose.yml
├── docker-compose.prod.yml
├── render.yaml
└── Makefile
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **UI** | Tailwind CSS, Recharts |
| **Routing & Data** | React Router, TanStack Query |
| **Backend** | Python 3.12, FastAPI |
| **ORM** | SQLAlchemy 2.x |
| **Validation** | Pydantic v2 |
| **Database** | PostgreSQL 16 |
| **Migrations** | Alembic |
| **Analytics** | pandas, NumPy, SciPy, statsmodels, scikit-learn |
| **Excel Processing** | openpyxl |
| **PDF Reports** | ReportLab |
| **Deployment** | Docker, Docker Compose, Render |

---

## 📐 Statistical Methodology

| Metric Type | Statistical Test | Typical Use |
|---|---|---|
| Binary / Conversion | Two-proportion Z-test | Conversion rate, CTR |
| Continuous / approximately normal | Welch's t-test | Session metrics, time-based metrics |
| Continuous / non-normal | Mann–Whitney U | Revenue and skewed metrics |
| Traffic Allocation | Chi-square goodness-of-fit | SRM detection |

Analysis includes:

- Confidence intervals
- Statistical significance
- Effect size
- Statistical power
- Minimum Detectable Effect (MDE)
- Sample-size related insights
- Sample Ratio Mismatch detection

---

## 🔄 Experiment Workflow

```text
Create Experiment
       ↓
Upload Dataset
       ↓
Schema & Data Quality Validation
       ↓
Map Experiment Columns
       ↓
Run Statistical Analysis
       ↓
SRM & Health Checks
       ↓
Segment Analysis
       ↓
Business Impact
       ↓
AI-Generated Insights
       ↓
Copilot & PDF Report
       ↓
Decision / Rollout Recommendation
```

---

## 📡 API Overview

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/auth/register` | POST | Register a new user |
| `/api/v1/auth/login` | POST | Authenticate user |
| `/api/v1/auth/me` | GET | Get current user |
| `/api/v1/experiments` | GET / POST | List or create experiments |
| `/api/v1/experiments/:id` | GET / PUT / DELETE | Experiment CRUD |
| `/api/v1/datasets/upload` | POST | Upload CSV / Excel dataset |
| `/api/v1/datasets/:id/quality` | GET | Retrieve data-quality analysis |
| `/api/v1/analytics/run/:id` | POST | Run statistical analysis |
| `/api/v1/analytics/overview` | GET | Analytics overview |
| `/api/v1/analytics/copilot` | POST | Ask experiment questions |
| `/api/v1/reports` | GET / POST | List or generate reports |
| `/api/v1/reports/:id/download` | GET | Download PDF report |

Interactive API documentation is available at:

`/docs`

---

## 🗄️ Database Schema

Core entities include:

- **users** — User accounts and authentication
- **workspaces** — Team workspaces
- **experiments** — Experiment definitions and hypotheses
- **experiment_variants** — Control and treatment variants
- **datasets** — Uploaded experiment datasets
- **dataset_columns** — Dataset metadata and column mappings
- **experiment_results** — Statistical analysis results
- **segment_results** — Segment-level analysis
- **experiment_alerts** — Health alerts and warnings
- **reports** — Generated PDF reports
- **activities** — Audit and activity log

---

## ⚡ Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL 14+
- Git

### 1. Clone the repository

```bash
git clone https://github.com/anisha432/a-b-testing.git
cd a-b-testing
```

### 2. Backend Setup

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Configure the required environment variables, then run migrations:

```bash
alembic upgrade head
```

Start the backend:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available through the Vite development server.

---

## 🐳 Docker Setup

Run the complete application with Docker Compose:

```bash
docker-compose up -d --build
```

For the production configuration:

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 🔐 Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL database connection string |
| `JWT_SECRET` | Secret used for JWT signing |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `VITE_API_URL` | Backend API base URL used by the frontend |
| `PORT` | Backend server port |

> Never commit real secrets or production credentials to GitHub.

---

## 🧪 Testing

### Backend

```bash
cd backend
python -m pytest tests/ -v
```

### Frontend Build

```bash
cd frontend
npm run build
```

---

## ☁️ Deployment

ExperimentIQ is deployed using **Render** with separate frontend and backend services.

### Production Components

```text
React + Vite Frontend
        │
        │ REST API
        ▼
FastAPI Backend
        │
        ▼
PostgreSQL Database
```

### Deployment Configuration

- Frontend → Render Static Site
- Backend → Render Web Service
- Database → PostgreSQL
- Environment variables configured through Render
- Automatic deployment triggered from the GitHub `master` branch

The repository also contains `render.yaml` for deployment configuration.

---

## 📊 Example Experiment

A typical experiment can evaluate whether a new checkout experience improves conversion.

```text
Experiment:
Checkout Button A/B Test

Control:
Existing checkout button

Treatment:
Redesigned checkout button

Primary Metric:
Conversion Rate

Allocation:
50% Control / 50% Treatment

Analysis:
Two-proportion Z-test
```

The platform can then evaluate statistical significance, uplift, experiment health, segments, business impact, and rollout recommendations.

---

## 🎯 Project Goals

ExperimentIQ was built to demonstrate an end-to-end **data analytics + experimentation + software engineering** workflow:

- Product experimentation
- Statistical analysis
- Data engineering
- Backend API development
- Interactive analytics
- AI-assisted insights
- Business intelligence
- Production deployment

---

## 🔮 Future Enhancements

Potential extensions include:

- Advanced Bayesian experimentation
- Sequential testing
- Automated sample-size recommendations
- Multi-armed bandits
- Experiment scheduling
- Advanced anomaly detection
- Team collaboration and permissions
- Experiment templates
- Expanded AI-driven recommendations

---

## 📄 License

This project is licensed under the **MIT License**.
