# Auto-Start Setup Guide

This guide will help you set up the DB Visualizer application to automatically start when your machine boots up.

## Prerequisites

- Linux system with systemd (most modern Linux distributions)
- Node.js and npm installed
- The application should be built at least once (the script will build it if needed)

## Setup Steps

### 1. Make the start script executable

```bash
chmod +x _scripts/start-prod.sh
```

### 2. Install the systemd service

Copy the service file to the systemd directory:

```bash
sudo cp _scripts/db-visualizer.service /etc/systemd/system/db-visualizer.service
```

### 3. Edit the service file (if needed)

You may need to modify the service file to match your setup:

```bash
sudo nano /etc/systemd/system/db-visualizer.service
```

**Important settings to check:**

- **User**: Replace `%i` with your actual username (e.g., `kim`)
- **WorkingDirectory**: Verify the path matches your project location
- **ExecStart**: Verify the path to the start script is correct
- **Environment variables**: Uncomment and set if needed (NODE_ENV, PORT, etc.)

Example with your username:
```ini
[Service]
Type=simple
User=kim
WorkingDirectory=/home/kim/CG3_Tech/Projects/Personal Project 2025/db-visualizer
ExecStart=/home/kim/CG3_Tech/Projects/Personal Project 2025/db-visualizer/_scripts/start-prod.sh
```

### 4. Reload systemd configuration

After creating or modifying the service file:

```bash
sudo systemctl daemon-reload
```

### 5. Enable the service to start on boot

```bash
sudo systemctl enable db-visualizer.service
```

### 6. Start the service

```bash
sudo systemctl start db-visualizer.service
```

### 7. Check the service status

```bash
sudo systemctl status db-visualizer.service
```

## Managing the Service

### Start the service
```bash
sudo systemctl start db-visualizer
```

### Stop the service
```bash
sudo systemctl stop db-visualizer
```

### Restart the service
```bash
sudo systemctl restart db-visualizer
```

### Check service status
```bash
sudo systemctl status db-visualizer
```

### View service logs
```bash
# View recent logs
sudo journalctl -u db-visualizer -n 50

# Follow logs in real-time
sudo journalctl -u db-visualizer -f

# View logs from today
sudo journalctl -u db-visualizer --since today
```

### Disable auto-start (if needed)
```bash
sudo systemctl disable db-visualizer.service
```

## Troubleshooting

### Service fails to start

1. **Check the service status:**
   ```bash
   sudo systemctl status db-visualizer
   ```

2. **Check the logs:**
   ```bash
   sudo journalctl -u db-visualizer -n 100
   ```

3. **Verify paths in the service file:**
   - Make sure the `WorkingDirectory` path is correct
   - Make sure the `ExecStart` path points to the correct script location
   - Make sure the script is executable (`chmod +x`)

4. **Check file permissions:**
   - The script should be executable: `chmod +x _scripts/start-prod.sh`
   - The user specified in the service file should have read/write access to the project directory

5. **Test the script manually:**
   ```bash
   cd /home/kim/CG3_Tech/Projects/Personal\ Project\ 2025/db-visualizer
   ./_scripts/start-prod.sh
   ```

### Service starts but stops immediately

- Check if Node.js and npm are in the PATH for the service user
- Check if the backend and frontend are built (run `npm run build` in both directories)
- Check if the ports (3000 for backend, 4173 for frontend preview) are already in use
- Review the log files in the project directory: `.backend.log` and `.frontend.log`

### Port conflicts

If ports 3000 or 4173 are already in use, you can:

1. **Change the backend port** by setting the `PORT` environment variable in the service file:
   ```ini
   Environment="PORT=3001"
   ```

2. **Change the frontend port** by modifying `vite.config.ts` or setting `VITE_PORT` environment variable

### Build issues

If the application needs to be rebuilt:

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build
```

## Notes

- The service will automatically restart if it crashes (configured with `Restart=always`)
- Logs are written to both systemd journal and log files in the project directory
- The service runs as the user specified in the service file (not as root)
- Make sure Node.js and npm are available in the PATH for the service user

## Alternative: User Service (No sudo required)

If you prefer not to use sudo, you can install it as a user service:

1. Create the user systemd directory (if it doesn't exist):
   ```bash
   mkdir -p ~/.config/systemd/user
   ```

2. Copy the service file:
   ```bash
   cp _scripts/db-visualizer.service ~/.config/systemd/user/
   ```

3. Edit the service file to remove the `User=` line (user services run as the current user)

4. Enable and start:
   ```bash
   systemctl --user daemon-reload
   systemctl --user enable db-visualizer.service
   systemctl --user start db-visualizer.service
   ```

5. Enable user services to start on login:
   ```bash
   sudo loginctl enable-linger $USER
   ```

