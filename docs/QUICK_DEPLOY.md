# Quick Deploy to Railway + Vercel (5 Minutes)

## Prerequisites
- GitHub account
- Your code pushed to GitHub

## Step 1: Deploy Backend to Railway (2 min)

1. Go to [railway.app](https://railway.app) → Sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `vudki` repository
4. Click "+ New" → "Database" → "PostgreSQL"
5. Click on your service → "Settings":
   - Root Directory: `server`
   - Start Command: `node index.js`
6. Click "Variables" → Add:
   ```
   JWT_SECRET=change-this-to-a-random-32-char-string
   NODE_ENV=production
   PORT=3000
   FRONTEND_URL=https://your-app.vercel.app
   ```
7. Click "Deploy"
8. Copy your backend URL (e.g., `https://vudki-production.up.railway.app`)

## Step 2: Initialize Database

1. In Railway, click PostgreSQL service → "Connect"
2. Copy the `DATABASE_URL`
3. In your terminal:
```bash
# Connect to Railway database
psql "your-database-url-from-railway"

# Paste your schema.sql content and run it
\i /path/to/your/server/schema.sql

# Or manually copy-paste the SQL commands
```

## Step 3: Deploy Frontend to Vercel (2 min)

1. Go to [vercel.com](https://vercel.com) → Sign in with GitHub
2. Click "Add New" → "Project"
3. Import your `vudki` repository
4. Configure:
   - Framework Preset: **Vite**
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Environment Variables → Add:
   ```
   VITE_API_URL=https://vudki-production.up.railway.app
   ```
   (Use your Railway URL from Step 1)
6. Click "Deploy"
7. Copy your Vercel URL (e.g., `https://vudki.vercel.app`)

## Step 4: Update Backend CORS (1 min)

1. Go back to Railway → Your backend service → "Variables"
2. Update `FRONTEND_URL` to your Vercel URL
3. Click "Redeploy"

## ✅ Done!

Your app is now live at:
- **Frontend**: `https://vudki.vercel.app`
- **Backend**: `https://vudki-production.up.railway.app`

---

## Test Your Deployment

1. Visit your Vercel URL
2. Try to register/login
3. Upload a receipt
4. Verify OCR works

---

## Troubleshooting

### "Failed to fetch" error
- Check CORS: Backend `FRONTEND_URL` matches your Vercel URL
- Check API URL: Frontend `.env.production` has correct Railway URL

### Database connection error
- Verify `DATABASE_URL` is set in Railway
- Make sure you ran `schema.sql` on the database

### OCR not working
- Check Railway logs for errors
- Verify `jimp` and `tesseract.js` are in `package.json` dependencies

---

## Costs

- **Railway**: $5/month (includes 500 hours + PostgreSQL)
- **Vercel**: FREE (unlimited bandwidth for hobby projects)
- **Total**: $5/month

---

## Auto-Deployments

Both platforms auto-deploy when you push to GitHub:
```bash
git add .
git commit -m "Update app"
git push origin main
```

Railway and Vercel will automatically rebuild and deploy! 🚀
