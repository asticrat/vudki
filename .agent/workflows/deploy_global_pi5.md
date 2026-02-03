---
description: Deploy Vudki globally on Raspberry Pi 5 using Cloudflare Tunnel
---

# Deploy Vudki on Pi 5 (Global Access)

This guide will help you expose your local Vudki server running on your Pi 5 to the internet securely using Cloudflare Tunnel.

## Prerequisites
- A **Raspberry Pi 5** with internet access.
- **Node.js** (v18+) and **PostgreSQL** installed on the Pi.
- A **Cloudflare Account** (free).
- (Optional) A **Domain Name** managed by Cloudflare.

## Step 1: Prepare the Application on Pi 5
1.  **Transfer Code**: Copy the entire `vudki` project folder to your Pi 5.
2.  **Environment Variables**: 
    - Ensure `server/.env` exists and contains correct DB credentials and `JWT_SECRET`.
3.  **Install Dependencies**:
    ```bash
    cd vudki
    npm install
    cd client && npm install
    cd ../server && npm install
    ```
4.  **Build Frontend**:
    We will serve the frontend via the Node.js backend to simplify deployment.
    ```bash
    cd vudki/client
    npm run build
    ```
    *This creates a `dist` folder which the server is configured to serve.*
5.  **Start Server**:
    ```bash
    cd vudki/server
    npm start
    # OR
    node index.js
    ```
    *Verify it runs on `http://localhost:3000` (or your configured PORT).*

## Step 2: Install Cloudflare Tunnel (`cloudflared`) on Pi
1.  **Download & Install**:
    (Assuming Pi 5 runs 64-bit Linux ARM64 (standard Raspberry Pi OS Bookworm 64-bit))
    ```bash
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
    sudo dpkg -i cloudflared.deb
    ```
2.  **Verify Setup**:
    ```bash
    cloudflared version
    ```

## Step 3: Start a Quick Tunnel (Easiest Method)
If you just want to test it quickly without a domain:

1.  **Run Tunel**:
    ```bash
    cloudflared tunnel --url http://localhost:3000
    ```
2.  **Get URL**:
    - The terminal will output a URL like `https://funny-names-random-words.trycloudflare.com`.
    - **Share this URL**. It is globally accessible!

## Step 4: Persistent Tunnel (Recommended for Permanent Use)
If you have a domain (e.g., `example.com`) on Cloudflare:

1.  **Login**:
    ```bash
    cloudflared tunnel login
    ```
    *Follow the link to authorize.*
2.  **Create Tunnel**:
    ```bash
    cloudflared tunnel create vudki-pi
    ```
    *Note the Tunnel UUID output.*
3.  **Configure**:
    Create a config file `config.yml` (e.g., in `~/.cloudflared/`):
    ```yaml
    tunnel: <Tunnel-UUID>
    credentials-file: /home/pi/.cloudflared/<Tunnel-UUID>.json
    
    ingress:
      - hostname: vudki.example.com
        service: http://localhost:3000
      - service: http_status:404
    ```
4.  **Route DNS**:
    ```bash
    cloudflared tunnel route dns vudki-pi vudki.example.com
    ```
5.  **Run Tunnel**:
    ```bash
    cloudflared tunnel run vudki-pi
    ```
    *Use `systemd` to keep it running in background.*

## Troubleshooting
- **Frontend 404s**: Ensure you ran `npm run build` in the `client` folder.
- **Database Errors**: Ensure PostgreSQL is running on the Pi (`sudo systemctl status postgresql`) and credentials in `.env` match.
