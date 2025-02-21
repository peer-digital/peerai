# PeerAI

PeerAI is a Swedish-based LLM inference service that ensures all customer data remains within Sweden while providing developer-friendly APIs and tools.

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

## Project Structure

```
peerai/
├── api/                  # FastAPI application
├── orchestrator/         # LLM inference orchestrator
├── sdk/                  # Client SDKs
├── admin-dashboard/      # Internal admin interface
├── customer-dashboard/   # Customer management interface
└── docs/                # Documentation
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