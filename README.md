# DB Visualizer

A comprehensive PostgreSQL database visualization and management tool built with React and NestJS. Explore, query, and manage your PostgreSQL databases through an intuitive web interface.

## 🎯 Overview

DB Visualizer is a full-featured database management application that provides a modern web interface for PostgreSQL databases. It offers powerful features for database exploration, query execution, schema visualization, and performance optimization.

## ✨ Features

### Core Features
- **Connection Management** - Securely manage multiple database connections with encrypted credential storage
- **Schema Browsing** - Explore database schemas, tables, columns, indexes, and relationships
- **Table Data Viewing** - View and browse table data with pagination, filtering, sorting, and search
- **SQL Query Execution** - Execute SQL queries with syntax highlighting, query history, and result visualization
- **ER Diagram Visualization** - Interactive entity-relationship diagrams with ReactFlow
- **Data Export** - Export table data and query results to CSV or JSON formats
- **Full Database Export** - Export complete database dumps (with or without data)

### Advanced Features
- **Query History & Saved Queries** - Track query execution history and save frequently used queries
- **Index Recommendations** - Analyze query patterns and get intelligent index recommendations
- **Global Search** - Search across tables, column names, and data values
- **Query Snippets** - Library of reusable SQL snippets organized by category
- **Query Validation** - Real-time SQL syntax validation with error highlighting
- **Query Optimization** - Performance analysis with EXPLAIN plans and optimization suggestions
- **Foreign Key Navigation** - Navigate relationships between tables via foreign keys
- **Charts & Visualizations** - Visualize query results and data with interactive charts

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Query (TanStack Query)** - Server state management
- **shadcn-ui** - UI component library
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **ReactFlow** - ER diagram visualization
- **Recharts** - Data visualization

### Backend
- **NestJS** - Node.js framework
- **TypeScript** - Type safety
- **PostgreSQL (pg)** - Database client
- **class-validator** - Input validation
- **AES-256-CBC** - Password encryption

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** database (for testing connections)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd db-visualizer
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Create .env file
   cp env.template .env
   
   # Generate encryption key
   openssl rand -base64 32
   # Add the generated key to .env as ENCRYPTION_KEY
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Create .env file (optional)
   echo "VITE_API_URL=http://localhost:3000/api" > .env
   ```

### Running the Application

**Option 1: Using the start script (recommended)**
```bash
# From project root
chmod +x _scripts/start-dev.sh
./_scripts/start-dev.sh
```

**Option 2: Manual start**
```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:8080 or http://localhost:5173
- **Backend API:** http://localhost:3000/api

### First Steps

1. Open the application in your browser
2. Click the Settings icon to open Connection Manager
3. Create a new database connection
4. Test and connect to your database
5. Start exploring your schemas and tables!

## 📁 Project Structure

```
db-visualizer/
├── backend/                 # NestJS backend API
│   ├── src/
│   │   ├── connections/     # Connection management
│   │   ├── schemas/         # Schema & metadata
│   │   ├── data/            # Table data operations
│   │   ├── queries/         # Query execution
│   │   ├── query-history/   # Query history & saved queries
│   │   ├── query-snippets/  # Query snippets management
│   │   ├── diagram/         # ER diagram generation
│   │   ├── export/          # Data export
│   │   ├── foreign-keys/    # Foreign key navigation
│   │   ├── index-recommendations/ # Index analysis
│   │   ├── search/         # Global search
│   │   ├── charts/         # Chart generation
│   │   └── common/         # Shared utilities
│   ├── database/           # File storage (connections, history)
│   └── dist/               # Compiled output
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utilities & API client
│   │   ├── hooks/          # Custom React hooks
│   │   └── contexts/       # React contexts
│   └── dist/              # Build output
├── _docs/                 # Documentation files
├── _scripts/               # Utility scripts
└── README.md              # This file
```

## 📚 Documentation

### Getting Started
- **[_docs/SETUP_GUIDE.md](./_docs/SETUP_GUIDE.md)** - Complete setup and installation guide

### Frontend Documentation
- **[_docs/FRONTEND_INTEGRATION_README.md](./_docs/FRONTEND_INTEGRATION_README.md)** - Frontend-backend integration guide
- **[_docs/API_SERVICE_DOCUMENTATION.md](./_docs/API_SERVICE_DOCUMENTATION.md)** - Frontend API service reference
- **[_docs/STATE_MANAGEMENT_DOCUMENTATION.md](./_docs/STATE_MANAGEMENT_DOCUMENTATION.md)** - State management patterns and best practices
- **[frontend/README.md](./frontend/README.md)** - Frontend-specific documentation

### Backend Documentation
- **[backend/README.md](./backend/README.md)** - Backend overview and quick start
- **[backend/_docs/API_DOCUMENTATION.md](./backend/_docs/API_DOCUMENTATION.md)** - Complete API endpoint reference
- **[backend/_docs/ARCHITECTURE.md](./backend/_docs/ARCHITECTURE.md)** - System architecture and design patterns
- **[backend/_docs/DEPLOYMENT.md](./backend/_docs/DEPLOYMENT.md)** - Production deployment guide

## 🔧 Development

### Available Scripts

**Backend:**
```bash
cd backend
npm run start:dev    # Development server with hot reload
npm run build        # Build for production
npm run start:prod   # Production server
npm run lint         # Run ESLint
npm test             # Run tests
```

**Frontend:**
```bash
cd frontend
npm run dev          # Development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Environment Variables

**Backend (.env):**
```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
ENCRYPTION_KEY=<your-encryption-key>
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3000/api
```

### Code Structure

The application follows a modular architecture:

- **Backend:** Feature-based modules with NestJS dependency injection
- **Frontend:** Component-based architecture with React Query for state management
- **API Communication:** Centralized API client with type-safe services
- **State Management:** React Query for server state, React Context for global client state

## 🔒 Security

- **Password Encryption:** Database passwords are encrypted using AES-256-CBC before storage
- **SQL Injection Prevention:** All queries use parameterized statements
- **Input Validation:** All API endpoints validate input using class-validator
- **CORS:** Configured to allow requests only from the frontend origin

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test              # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:cov      # Coverage report
```

### Frontend Tests
```bash
cd frontend
# Test pages available at:
# - /api-test
# - /state-test
# - /ui-ux-test
```

## 📦 Building for Production

### Backend
```bash
cd backend
npm run build
npm run start:prod
```

### Frontend
```bash
cd frontend
npm run build
# Output in frontend/dist/
```

## 🤝 Contributing

1. Follow TypeScript best practices
2. Use dependency injection (NestJS DI)
3. Always validate input with DTOs
4. Use parameterized queries (prevent SQL injection)
5. Handle errors gracefully
6. Write tests for new features

## 📄 License

MIT

## 🙏 Acknowledgments

Built with modern web technologies to provide a powerful and intuitive database management experience.

---

**For detailed setup instructions, see [_docs/SETUP_GUIDE.md](./_docs/SETUP_GUIDE.md)**

