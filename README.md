# Inventory & Order Management System

Phase one implementation for the technical assessment: a React frontend and FastAPI backend for products, customers, orders, inventory tracking, and dashboard summaries.

## Project Structure

```text
backend/
  app/
    api/routes/        FastAPI route modules
    core/              environment configuration
    db/                SQLAlchemy session setup
    models/            database models
    schemas/           request/response validation
    services/          business logic
frontend/
  src/
    api/               API client
    styles/            application CSS
    App.jsx            main application workspace
```

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

The backend expects PostgreSQL through `DATABASE_URL`. Tables are created automatically on startup for phase one. A migration tool can be added in the Docker/deployment phase.

API docs are available at `http://localhost:8000/docs`.

## Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

The frontend runs at `http://localhost:5173` and uses `VITE_API_BASE_URL` to reach the backend.

## Docker Setup

Use Docker Compose to run the full system with a frontend container, backend container, and PostgreSQL database container.

### 1. Create Docker environment file

```bash
copy .env.example .env
```

Open `.env` and change `POSTGRES_PASSWORD` to a strong password.

### 2. Build and start all services

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Backend docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

### 3. Run in background

```bash
docker compose up --build -d
```

### 4. View logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f database
```

### 5. Stop containers

```bash
docker compose down
```

### 6. Stop and remove database data

Only use this when you want a fresh database.

```bash
docker compose down -v
```

The database data is persisted in the named Docker volume `postgres_data`.

## Implemented Features

- Product create, list, update, delete
- Customer create, list, delete
- Order create, list, detail-style item display, delete
- Unique product SKU and customer email handling
- Inventory validation and automatic stock deduction on order creation
- Backend-calculated order totals
- Dashboard summary for products, customers, orders, and low-stock products
- Responsive React UI with form validation and user feedback

## Next Phase

- Add database migrations with Alembic
- Add tests and CI workflow
- Prepare deployment environment variables for Render/Railway and Vercel/Netlify
