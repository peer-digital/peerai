# PeerAI Admin Dashboard

The PeerAI Admin Dashboard is a web-based interface for managing and monitoring the PeerAI platform. It provides tools for user management, API key administration, usage analytics, and system configuration.

## Features

- **User Management**: View and manage user accounts, roles, and permissions
- **API Key Management**: Create, view, and revoke API keys
- **Analytics**: Monitor usage statistics, model performance, and error rates
- **System Settings**: Configure rate limits, security settings, and monitoring parameters
- **API Playground**: Interactive testing environment for all API endpoints
  - Test completions API with different models
  - Experiment with Vision API (beta)
  - Try Audio API features (beta)
  - Real-time response viewing

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **UI Components**: Material UI v5
- **State Management**: React Query
- **Data Visualization**: Recharts
- **Form Handling**: React Hook Form
- **API Client**: Axios
- **Build Tool**: Vite
- **Package Manager**: npm

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/peerai.git
   cd peerai/frontend/admin-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the project root:
   ```env
   # API Configuration
   VITE_API_BASE_URL=http://localhost:8000  # Backend API URL
   
   # Development Settings
   VITE_DEV_MODE=true                       # Enable development features
   
   # Test Configuration (for Cypress)
   VITE_TEST_EMAIL=super.admin@peerai.se    # Test user email
   VITE_TEST_PASSWORD=testpass123           # Test user password
   
   # Feature Flags
   VITE_ENABLE_BETA=false                   # Enable beta features
   ```

### Development

Start the development server:
```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`.

### Building for Production

Build the project:
```bash
npm run build
```

The built files will be in the `dist` directory.

### Code Quality

Run the linter:
```bash
npm run lint
```

## Project Structure

```
src/
├── api/          # API service modules
├── components/   # Reusable UI components
├── hooks/        # Custom React hooks
├── layouts/      # Page layout components
├── pages/        # Page components
├── theme/        # Material UI theme configuration
├── types/        # TypeScript type definitions
└── utils/        # Utility functions
```

## API Integration

The dashboard communicates with the PeerAI backend API. The base URL is configured through the `VITE_API_BASE_URL` environment variable. API requests are handled using Axios, and the configuration can be found in `src/api/config.ts`.

## Authentication

The dashboard uses JWT-based authentication. The token is stored in localStorage and automatically included in API requests through an Axios interceptor.

## API Playground

The API Playground is an interactive environment for testing PeerAI's API endpoints. It provides a user-friendly interface to:

- Test the completions API with different models:
  - Hosted LLM (default)
  - Mistral
  - Mock responses for testing

- Experiment with beta features:
  - Vision API for image analysis
  - Audio API for transcription and analysis

Features:
- Real-time response viewing
- Request history
- Error handling and display
- Syntax highlighting for JSON
- Copy response to clipboard
- Configurable parameters
- Mock mode for testing without API usage

Usage:
1. Navigate to the Playground page
2. Select an endpoint to test
3. Configure the request parameters
4. Click "Send Request" to test
5. View the response and any errors
6. Copy results or save for later reference

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and ensure all checks pass
4. Submit a pull request

## License

This project is proprietary software owned by PeerAI.
