# Deployment Guide - Make Your Receipt App Globally Accessible

## Quick Overview

You have 3 main deployment options:

1. **Cloud Platform (Easiest)** - Deploy to Render/Railway (~$5-10/month)
2. **Raspberry Pi Self-Host** - Run on your RPi5 at home (free but requires setup)
3. **Hybrid** - Frontend on Vercel (free), Backend on Railway ($5/month)

---

## Option 1: Cloud Platform Deployment (RECOMMENDED)

### Best Platform: Railway.app

**Why Railway:**
- ✅ Easy PostgreSQL database included
- ✅ Automatic HTTPS
- ✅ Simple Git-based deployment
- ✅ $5 free credit per month
- ✅ Great for Node.js apps

### Step-by-Step Railway Deployment

#### A. Prepare Your Code

1. **Create production start scripts** in `/server/package.json`:

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

2. **Create `.env.example`** in `/server/`:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-secret-key-min-32-chars
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.com
```

3. **Update CORS in `/server/index.js`** (already done, but verify):

```javascript
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
```

4. **Build frontend** in `/client/package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

#### B. Deploy Backend to Railway

1. **Sign up**: Go to [railway.app](https://railway.app) (use GitHub login)

2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account
   - Select your repository
   - Railway will auto-detect Node.js

3. **Add PostgreSQL Database**:
   - In your project, click "+ New"
   - Select "Database" → "PostgreSQL"
   - Railway will create a database and provide `DATABASE_URL`

4. **Set Environment Variables**:
   - Click on your backend service
   - Go to "Variables" tab
   - Add:
     ```
     JWT_SECRET=your-random-secret-at-least-32-characters-long
     NODE_ENV=production
     PORT=3000
     FRONTEND_URL=https://your-app.vercel.app
     ```
   - `DATABASE_URL` is automatically set by Railway

5. **Configure Root Directory** (if needed):
   - Go to "Settings" tab
   - Set "Root Directory" to `server`
   - Set "Start Command" to `node index.js`

6. **Deploy**:
   - Railway auto-deploys on every git push
   - Or click "Deploy" manually
   - Get your backend URL: `https://your-app.up.railway.app`

7. **Initialize Database**:
   ```bash
   # Connect to Railway PostgreSQL
   railway db connect
   
   # Or use the DATABASE_URL from Railway variables
   psql $DATABASE_URL -f schema.sql
   ```

#### C. Deploy Frontend to Vercel

1. **Update API URL** in `/client/src/App.jsx`:

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Use API_URL instead of hardcoded localhost
const response = await fetch(`${API_URL}/api/login`, {
  // ...
});
```

2. **Create `.env.production`** in `/client/`:

```env
VITE_API_URL=https://your-app.up.railway.app
```

3. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Set:
     - **Framework**: Vite
     - **Root Directory**: `client`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
   - Add Environment Variable:
     ```
     VITE_API_URL=https://your-app.up.railway.app
     ```
   - Click "Deploy"

4. **Update Backend CORS**:
   - Go back to Railway
   - Update `FRONTEND_URL` to your Vercel URL
   - Redeploy backend

✅ **Done! Your app is live:**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-app.up.railway.app`

---

## Option 2: Raspberry Pi Self-Hosting

### Requirements
- Raspberry Pi 5 (4GB+ RAM recommended)
- Static IP or Dynamic DNS (DuckDNS, No-IP)
- Router with port forwarding
- Domain name (optional but recommended)

### Step-by-Step RPi Deployment

#### A. Prepare Raspberry Pi

1. **Install Node.js 18+**:

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install -y postgresql postgresql-contrib nginx
```

2. **Setup PostgreSQL**:

```bash
sudo -u postgres psql
CREATE DATABASE receipts_db;
CREATE USER receipts_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE receipts_db TO receipts_user;
\q
```

3. **Initialize Database**:

```bash
psql -U receipts_user -d receipts_db -f /path/to/schema.sql
```

#### B. Deploy Your App

1. **Clone Repository**:

```bash
cd /home/pi
git clone https://github.com/your-username/vudki.git
cd vudki
```

2. **Setup Backend**:

```bash
cd server
npm install --production
cp .env.example .env
nano .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://receipts_user:your-secure-password@localhost:5432/receipts_db
JWT_SECRET=your-random-secret-at-least-32-characters-long
PORT=3000
NODE_ENV=production
```

3. **Setup Frontend**:

```bash
cd ../client
npm install
npm run build
```

#### C. Configure Nginx (Reverse Proxy)

1. **Create Nginx config**:

```bash
sudo nano /etc/nginx/sites-available/vudki
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or your DuckDNS domain

    # Frontend (React build)
    location / {
        root /home/pi/vudki/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

2. **Enable site**:

```bash
sudo ln -s /etc/nginx/sites-available/vudki /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### D. Run Backend as System Service

1. **Create systemd service**:

```bash
sudo nano /etc/systemd/system/vudki-backend.service
```

Add:
```ini
[Unit]
Description=Vudki Receipt App Backend
After=network.target postgresql.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/vudki/server
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=vudki-backend
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

2. **Start service**:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vudki-backend
sudo systemctl start vudki-backend
sudo systemctl status vudki-backend
```

#### E. Setup Port Forwarding

1. **Find your local IP**:
```bash
hostname -I
```

2. **Router Configuration**:
   - Log into your router (usually 192.168.1.1)
   - Find "Port Forwarding" settings
   - Forward external port 80 → internal IP:80 (your RPi)
   - Forward external port 443 → internal IP:443 (for HTTPS)

3. **Get Dynamic DNS** (if you don't have static IP):
   - Sign up at [DuckDNS](https://www.duckdns.org)
   - Create subdomain: `myreceipts.duckdns.org`
   - Install DuckDNS client on RPi:

```bash
mkdir ~/duckdns
cd ~/duckdns
nano duck.sh
```

Add:
```bash
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=YOUR-DOMAIN&token=YOUR-TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
```

```bash
chmod 700 duck.sh
crontab -e
```

Add:
```
*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

#### F. Setup HTTPS with Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d myreceipts.duckdns.org
```

Follow prompts, and certbot will auto-configure HTTPS.

✅ **Done! Access your app at:**
- `https://myreceipts.duckdns.org`

---

## Option 3: Hybrid Deployment

**Free Frontend + Paid Backend**

- Frontend: Vercel (FREE unlimited)
- Backend: Railway ($5/month) or Render (FREE tier with sleep)
- Database: Included with Railway/Render

Follow:
1. Backend setup from Option 1
2. Frontend setup from Option 1
3. Costs: $0-5/month depending on backend choice

---

## Environment Variables Summary

### Backend (.env)
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=min-32-chars-random-string
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
```

### Frontend (.env.production)
```env
VITE_API_URL=https://your-backend.railway.app
```

---

## Post-Deployment Checklist

- [ ] Test user registration
- [ ] Test receipt upload
- [ ] Test OCR functionality
- [ ] Test on mobile device
- [ ] Check HTTPS is working
- [ ] Verify CORS is configured correctly
- [ ] Test authentication flow
- [ ] Monitor server logs for errors
- [ ] Set up backups for PostgreSQL database
- [ ] Configure Firewall (if self-hosting)

---

## Cost Comparison

| Option | Monthly Cost | Effort | Best For |
|--------|--------------|--------|----------|
| **Railway** | $5-10 | Low | Quick deployment, no maintenance |
| **Render** | $0-7 | Low | Budget option, free tier available |
| **Vercel + Railway** | $5 | Medium | Best of both (free frontend) |
| **Raspberry Pi** | $0* | High | Learning, full control, one-time cost |

*RPi costs electricity (~$2/month) + one-time hardware cost

---

## Recommended: Railway + Vercel

For most users, I recommend:
1. **Backend on Railway** ($5/month, includes database)
2. **Frontend on Vercel** (FREE)

**Total: $5/month** with automatic deployments, HTTPS, and no server maintenance.

---

## Need Help?

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- Let's Encrypt: https://letsencrypt.org

---

## Quick Deploy Commands

```bash
# Clone and prepare
git clone your-repo
cd vudki

# Backend
cd server
npm install
# Set environment variables on platform

# Frontend  
cd ../client
npm install
npm run build
# Deploy dist folder or connect to Vercel

# Database
# Use platform's PostgreSQL or local
psql $DATABASE_URL -f schema.sql
```

That's it! Choose your deployment method and follow the steps above.
