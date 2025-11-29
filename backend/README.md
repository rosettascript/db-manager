# DB Visualizer Backend

Backend API for PostgreSQL Database Visualizer built with NestJS and TypeScript.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database (for testing connections)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the backend directory (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration:
```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
ENCRYPTION_KEY=your-secure-encryption-key-here
CONNECTIONS_FILE_PATH=./database/connections.json
```

### Running the Application

```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

### API Endpoint

The API is available at: `http://localhost:3000/api`

## 📁 Project Structure

```
backend/
├── src/
│   ├── common/           # Shared utilities and services
│   │   ├── database/     # Database connection and query builders
│   │   ├── guards/       # Authentication/authorization guards
│   │   └── interceptors/ # Exception filters and interceptors
│   ├── connections/      # Connection management module
│   ├── schemas/          # Schema and metadata module
│   ├── tables/           # Table data operations module
│   ├── query/            # SQL query execution module
│   ├── diagram/          # ER diagram module
│   ├── export/           # Data export module
│   ├── app.module.ts     # Root application module
│   ├── app.controller.ts # Root controller
│   ├── app.service.ts    # Root service
│   └── main.ts           # Application entry point
├── database/             # Storage for connection configurations
├── dist/                 # Compiled output (generated)
└── package.json
```

## 🔧 Available Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run start:prod` - Start production server
- `npm run build` - Build the application
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests

## 🛠️ Technology Stack

- **Framework:** NestJS
- **Language:** TypeScript
- **Database Client:** pg (node-postgres)
- **Validation:** class-validator, class-transformer
- **Configuration:** @nestjs/config

## 📝 Documentation

### Core Documentation
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference with all 32 endpoints
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design patterns
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guide for production

### Quick Reference
- **[BACKEND_START_HERE.md](../BACKEND_START_HERE.md)** - Quick start guide
- **[IMPLEMENTATION_CHECKLIST.md](../IMPLEMENTATION_CHECKLIST.md)** - Detailed implementation checklist
- **[PROGRESS_TRACKER.md](../PROGRESS_TRACKER.md)** - Progress tracking

### Phase Documentation
- Phase 1-10 implementation and test results
- Integration test scripts
- Test results and summaries

## 🔒 Security

- Connection credentials are encrypted at rest
- SQL injection prevention through parameterized queries
- CORS configured for frontend origin
- Input validation on all endpoints

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📚 Development Guidelines

1. Follow TypeScript best practices
2. Use dependency injection (NestJS DI)
3. Always validate input with DTOs
4. Use parameterized queries (prevent SQL injection)
5. Handle errors gracefully
6. Write tests for new features

## 🤝 Contributing

See the main project README for contribution guidelines.

## 📄 License

MIT

