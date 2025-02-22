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

- Backend API runs on: http://localhost:8000
- Frontend development server runs on: http://localhost:3000
- API documentation available at: http://localhost:8000/docs

## Features

- 🇸🇪 **Swedish Data Residency**: All data processing and storage within Sweden (Bahnhof Cloud)
- 🔒 **Security First**: Built-in authentication, rate limiting, and data encryption
- 🚀 **Developer Friendly**: Simple SDKs and clear documentation
- ⚡ **High Performance**: Optimized inference with failover support
- 📊 **Full Monitoring**: Comprehensive admin and customer dashboards

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

2. **Create and activate a virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Unix/macOS
```

3. **Install dependencies**
```bash
pip install -e ".[dev]"
```

4. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Initialize the database**
```bash
alembic upgrade head
```

6. **Start the development server**
```bash
uvicorn api.main:app --reload
```

The API will be available at `http://localhost:8000`

### Running Tests

```bash
pytest
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