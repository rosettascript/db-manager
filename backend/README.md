# DB Visualizer Backend

Backend API for PostgreSQL Database Visualizer built with NestJS and TypeScript.

## 🚀 Quick Start

For complete setup instructions, see [_docs/SETUP_GUIDE.md](../_docs/SETUP_GUIDE.md).

**Quick commands:**
```bash
npm install
cp env.template .env
# Edit .env with your configuration (see _docs/SETUP_GUIDE.md)
npm run start:dev
```

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
- **[_docs/API_DOCUMENTATION.md](./_docs/API_DOCUMENTATION.md)** - Complete API reference with all 32 endpoints
- **[_docs/ARCHITECTURE.md](./_docs/ARCHITECTURE.md)** - System architecture and design patterns
- **[_docs/DEPLOYMENT.md](./_docs/DEPLOYMENT.md)** - Deployment guide for production


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

