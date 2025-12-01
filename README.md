# DB Manager

A powerful, modern web-based PostgreSQL database management and visualization tool built with React and NestJS. Manage multiple database connections, explore schemas, execute queries, visualize relationships, and export data—all from a beautiful, intuitive interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Documentation](#documentation)
- [Development](#development)
- [Production Deployment](#production-deployment)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## ✨ Features

### 🔌 Connection Management
- **Multiple Database Connections**: Manage unlimited PostgreSQL database connections
- **Secure Password Storage**: Encrypted credentials using AES-256-CBC
- **Connection Testing**: Test connections before saving
- **Connection Pooling**: Efficient connection management with automatic pooling

### 📊 Schema & Data Exploration
- **Schema Browser**: Navigate through databases, schemas, and tables
- **Table Viewer**: Browse table data with advanced features:
  - Pagination (configurable page size)
  - Column filtering and sorting
  - Full-text search across columns
  - Column selection and visibility
- **Database Statistics**: View database size, table counts, and more

### 🔍 Query Execution
- **SQL Query Editor**: Execute custom SQL queries with syntax highlighting
- **Query History**: Automatic tracking of executed queries
- **Saved Queries**: Save frequently used queries with tags and descriptions
- **Query Snippets**: Reusable SQL code snippets
- **Query Execution Plans**: Analyze query performance with EXPLAIN
- **Query Timeout**: Configurable timeout limits

### 🗺️ Visualization
- **ER Diagrams**: Interactive entity-relationship diagrams
- **Foreign Key Navigation**: Explore relationships between tables
- **Schema Visualization**: Visual representation of database structure
- **Charts**: Create visualizations from query results

### 📤 Data Export
- **Multiple Formats**: Export to CSV or JSON
- **Filtered Exports**: Export filtered or selected data
- **Schema Dumps**: Export database schema definitions

### 🔧 Advanced Features
- **Index Recommendations**: Get suggestions for database optimization
- **Full-Text Search**: Search across database metadata
- **Dark Mode**: Beautiful dark/light theme support
- **Responsive Design**: Works seamlessly on desktop and tablet

---

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS 10+
- **Language**: TypeScript 5+
- **Database Driver**: PostgreSQL (pg 8+)
- **Validation**: class-validator, class-transformer
- **Encryption**: AES-256-CBC for secure password storage

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite 5+
- **UI Components**: Radix UI + shadcn/ui
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Visualization**: ReactFlow, Recharts
- **SQL Parsing**: node-sql-parser

---

## 📦 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ and npm (or yarn/pnpm)
- **PostgreSQL** database (for testing/development)
- **Git** (for cloning the repository)
- **OpenSSL** (for generating encryption keys)

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd db-manager
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp env.template .env

# Generate encryption key (required)
openssl rand -base64 32
# Add the generated key to .env:
# ENCRYPTION_KEY=your-generated-key-here

# Start development server
npm run start:dev
```

The backend will run on `http://localhost:3000`

**Verify Backend:**
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}
```

### 3. Frontend Setup

```bash
# In a new terminal
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173` or `http://localhost:8080`

**Verify Frontend:**
Open `http://localhost:5173` in your browser

---

## 📁 Project Structure

```
db-manager/
├── backend/                 # NestJS backend API
│   ├── src/
│   │   ├── connections/     # Connection management
│   │   ├── schemas/         # Schema metadata
│   │   ├── data/            # Table data operations
│   │   ├── queries/         # Query execution
│   │   ├── query-history/   # Query history & saved queries
│   │   ├── diagram/         # ER diagram generation
│   │   ├── export/          # Data export functionality
│   │   ├── foreign-keys/    # Foreign key navigation
│   │   ├── charts/          # Chart generation
│   │   ├── search/          # Database search
│   │   └── common/          # Shared utilities
│   ├── database/            # File storage (connections, history)
│   └── _docs/               # Backend documentation
│
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── lib/             # Utilities and API client
│   │   ├── contexts/        # React contexts
│   │   └── hooks/           # Custom hooks
│   └── public/              # Static assets
│
├── _docs/                   # Project documentation
│   ├── SETUP_GUIDE.md       # Detailed setup instructions
│   ├── API_SERVICE_DOCUMENTATION.md
│   └── FRONTEND_INTEGRATION_README.md
│
└── _scripts/                # Utility scripts
    ├── start-dev.sh         # Start both services
    └── start-prod.sh        # Production start script
```

---

## ⚙️ Configuration

### Backend Configuration

**File:** `backend/.env`

```bash
# Database Encryption Key (REQUIRED)
# Generate with: openssl rand -base64 32
ENCRYPTION_KEY=your-secure-encryption-key-here

# Server Port (optional, default: 3000)
PORT=3000

# Node Environment
NODE_ENV=development

# Frontend URL (optional, for CORS)
FRONTEND_URL=http://localhost:5173
```

**Important:** The `ENCRYPTION_KEY` is required for encrypting database passwords. Generate a secure key:

```bash
openssl rand -base64 32
```

### Frontend Configuration

**File:** `frontend/.env` (optional)

```bash
# API Base URL (optional, default: http://localhost:3000/api)
VITE_API_URL=http://localhost:3000/api
```

---

## 📚 Documentation

Comprehensive documentation is available in the `_docs/` directory:

- **[SETUP_GUIDE.md](./_docs/SETUP_GUIDE.md)** - Complete setup and installation guide
- **[API_SERVICE_DOCUMENTATION.md](./_docs/API_SERVICE_DOCUMENTATION.md)** - Frontend API service reference
- **[FRONTEND_INTEGRATION_README.md](./_docs/FRONTEND_INTEGRATION_README.md)** - Frontend-backend integration guide
- **[STATE_MANAGEMENT_DOCUMENTATION.md](./_docs/STATE_MANAGEMENT_DOCUMENTATION.md)** - State management patterns

### Backend Documentation

- **[backend/_docs/API_DOCUMENTATION.md](./backend/_docs/API_DOCUMENTATION.md)** - REST API reference
- **[backend/_docs/ARCHITECTURE.md](./backend/_docs/ARCHITECTURE.md)** - System architecture and design
- **[backend/_docs/DEPLOYMENT.md](./backend/_docs/DEPLOYMENT.md)** - Deployment guide

---

## 💻 Development

### Backend Development

```bash
cd backend

# Start with hot reload
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod

# Run linting
npm run lint

# Run tests
npm test
```

### Frontend Development

```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

### Start Both Services

Use the provided scripts:

```bash
# Development mode
./_scripts/start-dev.sh

# Production mode
./_scripts/start-prod.sh
```

---

## 🚢 Production Deployment

### Backend Production

```bash
cd backend

# Build the application
npm run build

# Start production server
npm run start:prod

# Or use PM2 for process management
pm2 start dist/main.js --name db-manager-api
```

### Frontend Production

```bash
cd frontend

# Build the application
npm run build

# Output will be in frontend/dist/
# Serve with any static file server:
# - nginx
# - Apache
# - Vercel
# - Netlify
```

### Systemd Service (Optional)

See `_scripts/SETUP_AUTOSTART.md` for setting up the backend as a systemd service.

---

## 🔒 Security

### Development
- Use strong `ENCRYPTION_KEY` (32+ characters)
- Don't commit `.env` files
- Use test databases, not production
- Keep dependencies updated

### Production
- Use environment variables for all secrets
- Enable HTTPS
- Configure CORS properly
- Use strong encryption keys
- Regular security audits
- Keep dependencies updated

### Security Features
- **Password Encryption**: All database passwords are encrypted using AES-256-CBC
- **SQL Injection Prevention**: All queries use parameterized statements
- **Input Validation**: DTOs with class-validator ensure data integrity
- **CORS Protection**: Configurable CORS settings for API access

---

## 🐛 Troubleshooting

### Common Issues

#### Backend Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

#### Encryption Key Error

```bash
# Generate a new key
openssl rand -base64 32

# Add to backend/.env
ENCRYPTION_KEY=<generated-key>
```

#### Database Connection Failed

- Verify database credentials
- Check PostgreSQL is running: `pg_isready`
- Verify user permissions
- Check `pg_hba.conf` for authentication settings

#### CORS Errors

- Ensure backend CORS allows frontend origin
- Check `backend/src/main.ts` CORS configuration
- Verify frontend URL matches allowed origins

#### Frontend API Connection Failed

- Verify backend is running: `curl http://localhost:3000/api/health`
- Check `VITE_API_URL` in `frontend/.env`
- Verify firewall/network settings

For more troubleshooting tips, see [SETUP_GUIDE.md](./_docs/SETUP_GUIDE.md#troubleshooting).

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Frontend Tests

```bash
cd frontend

# Run tests (if configured)
npm test
```

---

## 📝 Usage Example

1. **Start the application** (see Quick Start above)

2. **Create a Database Connection**:
   - Open the app in your browser
   - Click the Settings icon
   - Click "Add New Connection"
   - Enter your PostgreSQL connection details
   - Test the connection
   - Save the connection

3. **Explore Your Database**:
   - Select a connection from the sidebar
   - Browse schemas and tables
   - Click on a table to view its data
   - Use filters, sorting, and search to explore

4. **Execute Queries**:
   - Open the Query Editor
   - Write and execute SQL queries
   - View query history and save frequently used queries

5. **Visualize Relationships**:
   - Navigate to the Diagram view
   - Explore entity-relationship diagrams
   - Click on foreign keys to navigate relationships

6. **Export Data**:
   - View table data or query results
   - Click the Export button
   - Choose format (CSV/JSON) and options

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database visualization with [ReactFlow](https://reactflow.dev/)
- Charts powered by [Recharts](https://recharts.org/)

---

## 📧 Support

For issues, questions, or contributions, please open an issue on the repository.

---

**Happy Database Managing!** 🚀

