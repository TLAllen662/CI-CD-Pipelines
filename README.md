# Assignment #5 - Dockerize a Recipe Sharing Application

A full-stack recipe sharing application with React frontend and Node.js backend.

## Your Assignment
Your task is to containerize this application using Docker and Docker Compose. You'll need to create:
1. `frontend/Dockerfile` - To containerize the React app
2. `backend/Dockerfile` - To containerize the Node.js API
3. `docker-compose.yml` - To orchestrate both services

Once completed, users should be able to run the entire application with a single command: `docker-compose up`.

Good luck! 🚀

## Local Development Setup

### Prerequisites
- Node.js 16 or higher
- npm

### Running the Application Locally

1. **Start the Backend:**
```bash
cd backend
npm install
npm start
```
Backend will run on `http://localhost:8080`. You can preview all recipes at `http://localhost:8080/api/recipes`.

2. **Start the Frontend (in a new terminal)**:
```bash
cd frontend
npm install
npm run dev
```
Frontend will run on `http://localhost:3000` (or the next available port).

3. **Test the Application**:
    - Visit the URL shown in your terminal (Usually `http://localhost:3000`)
    - You should see sample recipes loaded
    - Try adding a new recipe using the form
    - Refresh the page to verify data persistence
    - You can also see that it has been added in the backed by visiting or refreshing `http://localhost:8080/api/recipes`

## API Endpoints
- `GET /api/recipes` - Get all recipes
- `GET /api/recipes/:id` - Get single recipe
- `POST /api/recipes` - Create new recipe
- `DELETE /api/recipes/:id` - Delete recipe
- `GET /api/health` - Health check

## Database Configuration

The backend now supports two database modes:

- **SQLite (default)** for local development and automated tests.
- **PostgreSQL** when cloud/database environment variables are provided.

To use PostgreSQL, set either:

- `DATABASE_URL`, or
- `DB_CLIENT=postgres` with `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD`.

If `DATABASE_PATH` is set, SQLite is used even when PostgreSQL variables are present.

## GitHub Actions Deployment

The workflow in `.github/workflows/deploy.yml` runs the backend and frontend
tests on pushes to `main` and can also be started manually from the Actions tab.
It submits the Cloud Build configurations only after both test jobs pass. Each
configuration builds and pushes its image, then deploys the service to Cloud
Run.

Configure these repository secrets before running the deployment:

- `GCP_PROJECT_ID` - the Google Cloud project ID.
- `GCP_WORKLOAD_IDENTITY_PROVIDER` - the full resource name of the Workload
  Identity Federation provider authorized for this GitHub repository.
- `GCP_SERVICE_ACCOUNT` - the email address of the deployment service account
  trusted by that provider.
- `CLOUDSQL_APP_PASSWORD` - the PostgreSQL password for the Cloud SQL app user
  (used during backend deployment as `PGPASSWORD`).

The service account must be permitted to submit Cloud Build jobs. The Cloud
Build service account must also have the permissions needed to push the images
and deploy the services to Cloud Run. For the backend deployment, the Cloud Run
runtime service account also needs `roles/cloudsql.client` to connect through
the Cloud SQL connector.

### Failed-test deployment gate demonstration

In [the demonstration run](https://github.com/TLAllen662/CI-CD-Pipelines/actions/runs/42270085872),
an intentionally failing backend test caused the backend test job to fail. The
build-and-deploy job depends on both test jobs, so GitHub Actions skipped it:
neither Cloud Build configuration was submitted, and that run did not change
the Cloud Run deployment. The deliberate failure has since been removed.

A successful test run alone does not ensure a successful deployment: Google
Cloud authentication and permissions must also be configured.

## Project Structure
```bash
recipe-app/
├── frontend/       # React application (Vite)
├── backend/        # Node.js/Express API
└── README.md       # This file
```