# Vudki on Raspberry Pi - Implementation Plan

Since you have a **Raspberry Pi 5**, the best approach is to use it as a **dedicated Home Server**. This allows:
1.  **Always-On Availability**: The app runs 24/7, even when your Mac is closed.
2.  **Access for Housemates**: Everyone can access the app via the Pi's IP address (e.g., `http://192.168.1.50:3000`) on their phones.
3.  **Data Persistence**: The Postgres database lives safely on the Pi.

## Architecture

*   **Frontend (React/Vite)**: Built and served as static files (or served by a simple Node server) on the Pi.
*   **Backend (Node/Express)**: Runs continuously on the Pi.
*   **Database (PostgreSQL)**: Runs on the Pi.

## Step-by-Step Setup Guide

### 1. Prepare the Raspberry Pi
*   Ensure it has an OS installed (Raspberry Pi OS Lite is best).
*   Connect it to your router (Ethernet preferred, or stable WiFi).
*   Find its IP address (`hostname -I`).
*   Enable SSH.

### 2. Install Dependencies on Pi
Connect via SSH:
```bash
ssh pi@<PI_IP_ADDRESS>
```
Install Node.js and PostgreSQL:
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Configure Database
Log in to Postgres on the Pi and create the user/db:
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE house_split;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE house_split TO postgres;
-- Make sure to allow external connections if needed, but local is fine for the app.
\q
```

### 4. Deploy Code
Copy your project from Mac to Pi:
```bash
# On Mac
scp -r ~/vudki pi@<PI_IP_ADDRESS>:~/vudki
```

### 5. Run the App
On the Pi:
```bash
cd ~/vudki
# Install dependencies
cd server && npm install
cd ../client && npm install && npm run build

# Start Backend (using PM2 for reliability)
sudo npm install -g pm2
cd ~/vudki/server
pm2 start index.js --name "vudki-server"

# Serve Frontend (Quickest way is to have the backend serve the 'dist' folder, keeping it simple)
# We might need to adjust server/index.js to serve static files from ../client/dist
```

## Recommendation
**For now**: We should continue developing on your Mac to fix the UI (Fonts, Glass effects) and features (OCR).
**Next**: I can create a script to help you deploy to the Pi once we are stable.

**Alternative**: Docker. If you know Docker, we can wrap the whole app in a `docker-compose.yml` file, which makes deploying to the Pi instant.
