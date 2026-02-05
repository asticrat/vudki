# How to Update Vudki on Raspberry Pi 5

Since your Pi is running the live version of Vudki, you need to sync the changes from your Mac to the Pi.

## Option 1: The Git Method (Recommended)
This is best if you followed the `deploy_global_pi5` guide.

### Step 1: On Your Mac (Save Changes)
Open your terminal in the project folder and run:
```bash
git add .
git commit -m "Added household delete option and fixed OCR autoscan"
git push origin main
```

### Step 2: On Your Raspberry Pi (Update)
SSH into your Pi:
```bash
ssh pi@<YOUR_PI_IP_ADDRESS>
```

Then run these commands to update everything:
```bash
cd ~/vudki

# 1. Get latest code
git pull origin main

# 2. Update Backend
cd server
npm install 
# (If we added new DB columns, we might need to recreate DB, but for now logic is JS only)
pm2 restart vudki-app

# 3. Update Frontend
cd ../client
npm install
npm run build
mv dist ../server/public

# 4. Final Restart
pm2 restart vudki-app
```

---

## Option 2: The Direct Copy Method (SCP)
If you haven't set up Git on the Pi, you can copy files directly over your network.

### Run this from your Mac terminal:
Replace `<YOUR_PI_IP>` with your Pi's actual IP address.

```bash
# Copy Server Files (skipping node_modules to be safe)
scp -r server/*.js server/package.json pi@<YOUR_PI_IP>:~/vudki/server/

# Copy Frontend Build
# First, build locally on Mac:
cd client && npm run build && cd ..

# Then copy the 'dist' folder to the Pi
scp -r client/dist pi@<YOUR_PI_IP>:~/vudki/client/
```

**After copying:**
1. SSH into Pi.
2. Move the new dist folder if you are serving it from server/public:
   `mv ~/vudki/client/dist ~/vudki/server/public`
3. Restart the app: `pm2 restart vudki-app`
