# Deployment Guide

## 📋 Overview

This guide covers deployment procedures for the DB Visualizer Backend in both development and production environments.

## 🚀 Quick Start

### Development Setup

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp env.template .env
   # Edit .env with your settings
   ```

3. **Generate Encryption Key**
   ```bash
   openssl rand -base64 32
   # Add to .env as ENCRYPTION_KEY
   ```

4. **Start Development Server**
   ```bash
   npm run start:dev
   ```

5. **Verify Server**
   ```bash
   curl http://localhost:3000/api/health
   ```

## ⚙️ Environment Configuration

### Required Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=3000
FRONTEND_URL=http://localhost:5173

# Encryption (REQUIRED)
ENCRYPTION_KEY=<your-base64-encoded-key>

# Optional: Logging
LOG_LEVEL=info
```

### Generating Encryption Key

```bash
# Generate a secure key
openssl rand -base64 32

# Output example:
# xK8j9L2mN5pQ7rT4vW6yZ8aB1cD3eF5gH7iJ9kL0mN2oP4qR6sT8uV0wX2yZ
```

**⚠️ Important:** 
- Never commit the encryption key to version control
- Use different keys for development and production
- Keep keys secure and backed up

## 📦 Build Process

### Development Build

```bash
npm run start:dev
```

- Hot reload enabled
- Source maps for debugging
- Verbose error messages

### Production Build

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm run start:prod
```

**Build Output:** `dist/` directory contains compiled JavaScript

### Build Verification

```bash
# Check if build succeeded
npm run build

# Test production build
npm run start:prod
curl http://localhost:3000/api/health
```

## 🐳 Docker Deployment (Optional)

### Dockerfile

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "run", "start:prod"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - FRONTEND_URL=http://localhost:5173
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    volumes:
      - ./database:/app/database
    restart: unless-stopped
```

### Docker Commands

```bash
# Build image
docker build -t db-visualizer-backend .

# Run container
docker run -p 3000:3000 \
  -e ENCRYPTION_KEY=<your-key> \
  -v $(pwd)/database:/app/database \
  db-visualizer-backend

# Using docker-compose
docker-compose up -d
```

## 🌐 Production Deployment

### Prerequisites

- Node.js 18+ installed
- PostgreSQL databases accessible
- Reverse proxy (nginx, Caddy, etc.) recommended

### Deployment Steps

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd db-visualizer/backend
   ```

2. **Install Dependencies**
   ```bash
   npm ci --only=production
   ```

3. **Configure Environment**
   ```bash
   cp env.template .env
   # Edit .env with production values
   ```

4. **Build Application**
   ```bash
   npm run build
   ```

5. **Start Server**
   ```bash
   npm run start:prod
   ```

### Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/main.js --name db-visualizer-backend

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

### Nginx Reverse Proxy

Example `nginx.conf`:

```nginx
server {
    listen 80;
    server_name api.example.com;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📁 File Permissions

### Database Directory

```bash
# Create database directory
mkdir -p database/query-history database/saved-queries

# Set permissions (if needed)
chmod 755 database
chmod 644 database/*.json
```

### Backup Strategy

```bash
# Backup connections
cp database/connections.json backups/connections-$(date +%Y%m%d).json

# Backup query history
tar -czf backups/query-history-$(date +%Y%m%d).tar.gz database/query-history/

# Backup saved queries
tar -czf backups/saved-queries-$(date +%Y%m%d).tar.gz database/saved-queries/
```

## 🔍 Health Checks

### Built-in Health Endpoint

```bash
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-29T08:00:00.000Z",
  "service": "db-visualizer-backend"
}
```

### Monitoring Script

Create `health-check.sh`:

```bash
#!/bin/bash
RESPONSE=$(curl -s http://localhost:3000/api/health)
STATUS=$(echo $RESPONSE | jq -r '.status')

if [ "$STATUS" != "ok" ]; then
    echo "Health check failed!"
    exit 1
fi
```

## 🔒 Security Checklist

### Production Security

- [ ] Use strong encryption key (32+ bytes)
- [ ] Enable HTTPS via reverse proxy
- [ ] Restrict CORS to frontend domain only
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Backup encryption keys securely
- [ ] Use environment variables (not hardcoded)
- [ ] Set proper file permissions

### Environment Variables

**Never commit:**
- `ENCRYPTION_KEY`
- Database passwords
- API keys
- Secrets

**Safe to commit:**
- `PORT` (if default)
- `LOG_LEVEL`
- Non-sensitive configuration

## 📊 Logging

### Log Levels

- `error` - Errors only
- `warn` - Warnings and errors
- `info` - Informational messages
- `debug` - Detailed debugging

### Log Configuration

```typescript
// In main.ts or environment config
const logLevel = process.env.LOG_LEVEL || 'info';
```

### Log Rotation

Use PM2 or systemd journal for log rotation:

```bash
# PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 🔄 Updates & Maintenance

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm ci --only=production

# Rebuild
npm run build

# Restart (PM2)
pm2 restart db-visualizer-backend

# Or restart service
systemctl restart db-visualizer-backend
```

### Database Migration

If switching from file storage to database:

1. Export current data
2. Run migration script
3. Verify data integrity
4. Update configuration

## 🐛 Troubleshooting

### Common Issues

**1. Server won't start**
- Check PORT is not in use
- Verify ENCRYPTION_KEY is set
- Check file permissions

**2. Connection errors**
- Verify database credentials
- Check network connectivity
- Review connection pool settings

**3. File permission errors**
- Check database/ directory permissions
- Ensure write access to JSON files

**4. CORS errors**
- Verify FRONTEND_URL matches frontend
- Check CORS configuration in main.ts

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run start:dev

# Check PM2 logs
pm2 logs db-visualizer-backend
```

## 📈 Performance Tuning

### Connection Pool Settings

Adjust in connection configuration:

```typescript
{
  max: 20,        // Max pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
}
```

### Server Resources

**Minimum Requirements:**
- CPU: 1 core
- RAM: 512 MB
- Disk: 100 MB

**Recommended:**
- CPU: 2+ cores
- RAM: 1 GB+
- Disk: 1 GB+

## ✅ Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Encryption key generated and set
- [ ] Build succeeds without errors
- [ ] All tests pass
- [ ] Health check endpoint works
- [ ] CORS configured correctly
- [ ] File permissions set
- [ ] Backup strategy in place
- [ ] Monitoring setup
- [ ] Security checklist reviewed

---

**Last Updated:** 2025-11-29

