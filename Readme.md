# Transport Fleet & Trip Management System (TFTMS)

A lightweight, database-driven system for managing fleet-based transport operations and trip records.

---

## About

Transport Fleet & Trip Management System (TFTMS) helps organizations move away from manual transport logs and spreadsheets by providing a structured and auditable way to manage fleet operations.

The system manages vehicles, routes, stops, staff (drivers and conductors), passengers, and daily trips. Trips follow a real-world workflow where operators handle trip execution and managers or gate staff verify and officially close trips, ensuring accountability and accurate record-keeping.

TFTMS is designed with a strong focus on database correctness, transactional workflows, and reporting, making it suitable for both academic use and real-world scenarios.

---

## Architecture

```
tftms/
├── backend/          — FastAPI + PostgreSQL API server
│   ├── app/          — Application code (models, routes, schemas)
│   ├── sql/          — Database schema, views, procedures, triggers
│   └── Dockerfile    — Backend container
├── frontend/         — React + TypeScript + Tailwind CSS
│   ├── src/          — Components, pages, stores, API client
│   └── Dockerfile    — Frontend container (multi-stage build)
└── compose.yaml      — Docker Compose (3 services: db, api, frontend)
```

---

## Tech Stack

| Layer     | Technology                                         |
|-----------|---------------------------------------------------|
| Backend   | Python, FastAPI, SQLAlchemy, PostgreSQL 16          |
| Frontend  | React 18, TypeScript, Tailwind CSS v4, Framer Motion, Three.js, Zustand, Recharts |
| Infra     | Docker, Docker Compose                             |

---

## Key Features

- Fleet (vehicle) management
- Route and stop management
- Staff and passenger management
- Daily trip logging with stop-level events
- Two-step trip closure (operator + verifier)
- Incident and maintenance tracking
- Audit-friendly data model
- Reporting and analytics (trip summary, vehicle utilization, incident summary)
- Interactive dashboard with real-time stats
- Role-based access control (Admin, Manager, Driver, Conductor)

---

## Getting Started

### Prerequisites

- Docker & Docker Compose installed
- (For local dev) Node.js 20+, Python 3.12+

### Quick Start (Docker)

```bash
# Clone the repo
git clone https://github.com/ChaoticNebula5/Transport-Fleet-Trip-Management-System-TFTMS-.git
cd tftms

# Copy and edit environment variables
cp backend/.env.example backend/.env

# Start all services
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

- **Frontend dev**: http://localhost:5173
- **Backend**: http://localhost:8000

---

## API Endpoints

| Method | Path                          | Role Required       | Description             |
|--------|-------------------------------|---------------------|-------------------------|
| POST   | `/auth/register`              | —                   | Register a new user     |
| POST   | `/auth/login`                 | —                   | Login, get JWT token    |
| GET    | `/auth/users`                 | ADMIN               | List all users          |
| PATCH  | `/auth/users/{id}`            | ADMIN               | Update user role/status |
| GET    | `/me`                         | Authenticated       | Current user info       |
| GET    | `/trips`                      | Authenticated       | List trips (filtered)   |
| POST   | `/trips/{id}/start`           | DRIVER              | Start a trip            |
| POST   | `/trips/{id}/request-end`     | DRIVER              | Request trip end        |
| POST   | `/trips/{id}/verify`          | ADMIN               | Verify and close trip   |
| POST   | `/trips/{id}/cancel`          | ADMIN               | Cancel a trip           |
| POST   | `/trips/{id}/incident`        | DRIVER, CONDUCTOR   | Report incident         |
| POST   | `/trips/{id}/stops/{stop_id}` | CONDUCTOR           | Record stop event       |
| GET    | `/reports/trip-summary`       | ADMIN, MANAGER      | Trip summary report     |
| GET    | `/reports/vehicle-utilization` | ADMIN, MANAGER     | Vehicle utilization     |
| GET    | `/reports/incident-summary`   | ADMIN, MANAGER      | Incident summary        |

---

## Use Cases

- School and college transport systems
- Corporate shuttle services
- Industrial and factory transport
- Campus and residential transport
- Any organization operating scheduled fleet transport

---

## License

This project is intended for academic and learning purposes.
