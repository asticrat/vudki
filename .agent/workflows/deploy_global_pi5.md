---
description: Deploy Vudki globally on Raspberry Pi 5 using Cloudflare Tunnel
---

# Deploy Vudki Globally with Cloudflare Tunnel (Free & Secure)

This guide takes your local Vudki app and makes it accessible globally (e.g., `https://vudki.yourname.com`) using your Raspberry Pi 5. No port forwarding is required.

## Phase 1: Prepare Raspberry Pi (SSH In)

**1. Update System & Install Essentials**
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql postgresql-contrib git
```

**2. Setup Database**
```bash
sudo -u postgres psql
# Inside SQL prompt:
CREATE DATABASE house_split;
ALTER USER postgres WITH PASSWORD 'postgres';
\q
```

## Phase 2: Deploy Code

**1. Clone Repo**
```bash
git clone https://github.com/asticrat/vudki.git
cd vudki
```

**2. Backend Setup**
```bash
cd server
npm ci --production
# Create production .env
echo "PORT=3000
DB_USER=postgres
DB_HOST=localhost
DB_NAME=house_split
DB_PASSWORD=postgres
DB_PORT=5432
JWT_SECRET=$(openssl rand -hex 32)" > .env

# Initialize DB
node init_db.js
node init-dev-account.js
```

**3. Frontend Setup**
```bash
cd ../client
npm install
npm run build
```

**4. Link Frontend to Backend**
We will serve the frontend *through* the backend for simplicity.
*   Move the build files: `mv dist ../server/public`
*   Modified `server/index.js` already handles static serving (ensure it serves `public` or `client/dist`).

**5. Start with PM2 (Process Manager)**
```bash
sudo npm install -g pm2
cd ../server
pm2 start index.js --name "vudki-app"
pm2 save
pm2 startup
```
*Your app is now running locally on the Pi at `http://localhost:3000`*

## Phase 3: Go Global (Cloudflare Tunnel)

This is the magic step. It assigns a secure HTTPS URL to your Pi without opening router ports.

**1. Install Cloudflared**
```bash
# Add Cloudflare GPG key
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null

# Add Repo
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main' | sudo tee /etc/apt/sources.list.d/cloudflared.list

# Install
sudo apt-get update && sudo apt-get install cloudflared
```

**2. Authenticate & Create Tunnel**
```bash
cloudflared tunnel login
# (Click the link, login to Cloudflare Dashboard)

cloudflared tunnel create vudki-tunnel
# (Copy the Tunnel ID generated)

# Route to your domain (assuming you have a domain on Cloudflare)
cloudflared tunnel route dns vudki-tunnel vudki.yourdomain.com
# OR simply use the random URL provided if you don't have a domain:
cloudflared tunnel --url http://localhost:3000
```

**3. Run Tunnel Permanently**
Create a config file: `nano ~/.cloudflared/config.yml`
```yaml
tunnel: <Tunnel-UUID>
credentials-file: /home/pi/.cloudflared/<Tunnel-UUID>.json

ingress:
  - hostname: vudki.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

Start the service:
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
```

## Done! 🚀
Visit `https://vudki.yourdomain.com` (or the provided random URL) from anywhere in the world.
