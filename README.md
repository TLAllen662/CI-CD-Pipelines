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

The service account must be permitted to submit Cloud Build jobs. The Cloud
Build service account must also have the permissions needed to push the images
and deploy the services to Cloud Run.

## Project Structure
```bash
recipe-app/
├── frontend/       # React application (Vite)
├── backend/        # Node.js/Express API
└── README.md       # This file
```