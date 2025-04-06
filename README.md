# Peer AI

This repository is organized into two main components:

## Project Structure

```
.
├── backend/               # Backend services and API
│   ├── alembic/          # Database migrations
│   ├── models/           # Database models
│   ├── routes/           # API endpoints
│   ├── scripts/          # Backend utility scripts
│   ├── main.py          # Main FastAPI application
│   └── config.py        # Backend configuration
│
├── frontend/             # Frontend applications
│   └── admin-dashboard/  # Admin dashboard React application
│
├── deployment/           # Deployment configurations
├── docs/                 # Project documentation
├── orchestrator/         # Service orchestration
├── scripts/             # Project-wide utility scripts
└── tests/               # Test suites
```

## Backend

The backend is built with FastAPI and provides the REST API endpoints. It's located in the `backend/` directory.

### Setup
1. Create and activate a virtual environment
2. Install dependencies: `pip install -r backend/requirements.txt`
3. Copy `.env.example` to `.env` and configure
4. Run migrations: `alembic upgrade head`
5. Start the server: `uvicorn backend.main:app --reload`

## Frontend

The frontend is built with React and is located in the `frontend/` directory. It contains:
- Admin Dashboard: A React application for managing the platform

### Setup
1. Navigate to the specific frontend application directory
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

## Development

### Running Frontend and Backend Together

For local development, you can run both the frontend and backend applications together using:

```bash
# Using npm
npm run dev

# Or directly using the script
./scripts/dev.sh
```

This script will:
1. Check for and setup the Python virtual environment
2. Install backend dependencies if needed
3. Install frontend dependencies if needed
4. Start both services concurrently:
   - Backend will run at http://localhost:8000
   - Frontend will run at http://localhost:5173

You can access the combined application by navigating to http://localhost:5173 in your web browser.

### Stopping the Application

To stop both the frontend and backend services, press `Ctrl+C` in the terminal where they are running.

- Backend API runs on: http://localhost:8000
- Frontend development server runs on: http://localhost:3000
- API documentation available at: http://localhost:8000/docs

## Features

- 🇸🇪 **Swedish Data Residency**: All data processing and storage within Sweden (Bahnhof Cloud)
- 🔒 **Security First**: Built-in authentication, rate limiting, and data encryption
- 🚀 **Developer Friendly**: Simple SDKs and clear documentation
- ⚡ **High Performance**: Optimized inference with failover support
- 📊 **Full Monitoring**: Comprehensive admin and customer dashboards

## Role-Based Access Control (RBAC)

The platform implements a comprehensive role-based access control system with the following roles:

### Roles & Permissions

1. **Guest** (Not signed in)
   - Can access public documentation
   - No access to authenticated API endpoints
   - No portal or account management features

2. **User**
   - Access personal usage & account details
   - Use the PeerAI API with their own API keys
   - View personal usage logs and tokens consumed

3. **User Admin** (Customer Admin)
   - Everything a User can do
   - Manage team-level billing details
   - Manage team memberships (invite/remove users)
   - View team usage statistics
   - Cannot manage other teams or create super admins

4. **Super Admin** (Peer Digital Admin)
   - Full system access
   - Manage any team or user
   - Access system-wide analytics and configuration
   - Reserved for Peer Digital staff

### API Endpoints

RBAC-related endpoints are available under `/api/v1/rbac/`:

- `POST /teams` - Create a new team (User Admin+)
- `GET /teams/{team_id}` - Get team details (Team members)
- `PUT /users/{user_id}/role` - Update user role (User Admin+)
- `POST /teams/{team_id}/members/{user_id}` - Add user to team (User Admin+)
- `DELETE /teams/members/{user_id}` - Remove user from team (User Admin+)
- `GET /teams/{team_id}/members` - List team members (User Admin+)

### Implementation Status

> **Note:** Team management and RBAC functionality is partially implemented. The database models and core services are in place, but some API routes and UI components are still in development. The `TeamManagement.tsx` component contains UI placeholders, but the backend integration is not yet complete. This feature is planned for the next release.

## Quick Start

### Prerequisites

- Python 3.11 or higher
- PostgreSQL 15 or higher
- macOS (ARM/Intel) or Linux

### Local Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/peerdigital/peerai.git
cd peerai
```

2. **Install dependencies**
```bash
# Install all dependencies including development tools
pip install -e ".[dev]"
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Initialize the database**
```bash
# Using the sync_db.sh script (recommended for new developers)
./backend/scripts/sync_db.sh

# Or using alembic directly
alembic upgrade head
```

5. **Start the development server**
```bash
uvicorn api.main:app --reload
```

The API will be available at `http://localhost:8000`

### Running Tests

The project uses PostgreSQL for both development and testing environments. Before running tests:

1. **Create a test database**
```bash
createdb peerai_test
```

2. **Configure test database**
```bash
# In your .env file, set the test database URL:
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/peerai_test
```

3. **Run tests**
```bash
pytest
```

The test suite uses a separate PostgreSQL database to ensure isolation from your development environment. Each test runs in a transaction that is rolled back after the test completes.

## Database Management

### Synchronizing the Database Schema

When setting up a new development environment or after pulling changes that include database migrations, you need to synchronize your database schema. We provide a convenient script for this purpose:

```bash
# Using the shell script (recommended)
./backend/scripts/sync_db.sh

# Or using the Python script directly
python -m backend.scripts.sync_database
```

This script will:
1. Check your database connection
2. Identify the current migration version
3. Run all necessary migrations to bring your schema up to date
4. Provide clear feedback on the process

### Creating Migrations

If you've made changes to the database models, you need to create a new migration:

```bash
# Generate a new migration
alembic revision --autogenerate -m "description_of_changes"

# Apply the migration
alembic upgrade head
```

## Documentation

- [API Documentation](docs/api.md)
- [Architecture Overview](docs/architecture.md)
- [Deployment Guide](docs/deployment.md)
- [Security Guidelines](docs/security.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Proprietary - All rights reserved by Peer Digital Sweden AB

## Support

For support, email support@peerdigital.se or visit our [support portal](https://support.peerdigital.se).