# Pre-Deployment Checklist ✅

Complete this checklist before deploying to production.

## Code Preparation

### Backend
- [ ] `server/package.json` has `"start": "node index.js"` script ✅ (Done)
- [ ] `.env.example` exists with all required variables ✅ (Done)
- [ ] `.gitignore` excludes `.env`, `node_modules`, `uploads/` ✅ (Done)
- [ ] All sensitive data uses environment variables
- [ ] CORS configured to accept production frontend URL
- [ ] Database schema (`schema.sql`) is ready

### Frontend
- [ ] `.env.production` template created ✅ (Done)
- [ ] All API calls use environment variable for base URL
- [ ] Build command works: `npm run build`
- [ ] Production build tested locally: `npm run preview`

### Database
- [ ] `schema.sql` includes all tables
- [ ] Initial admin user creation script ready (optional)
- [ ] Database backup strategy planned

## Security

- [ ] JWT_SECRET is at least 32 characters and random
- [ ] Passwords are hashed with bcrypt ✅ (Done)
- [ ] SQL injection prevented (using parameterized queries) ✅ (Done)
- [ ] File upload size limits configured ✅ (Done - 10MB)
- [ ] CORS properly configured
- [ ] Environment variables not committed to Git ✅ (Done)

## Testing

- [ ] Test user registration flow
- [ ] Test login flow
- [ ] Test receipt upload
- [ ] Test OCR with good quality receipt
- [ ] Test receipt sharing between users
- [ ] Test balance calculations
- [ ] Test on mobile device
- [ ] Test offline behavior

## Performance

- [ ] Images are compressed before storage
- [ ] Database queries are optimized
- [ ] Unnecessary console.logs removed from production
- [ ] Static assets are cached

## Documentation

- [ ] README.md created ✅ (Done)
- [ ] DEPLOYMENT_GUIDE.md available ✅ (Done)
- [ ] QUICK_DEPLOY.md available ✅ (Done)
- [ ] API endpoints documented
- [ ] Environment variables documented ✅ (Done)

## Deployment Platform Setup

### Railway (Backend)
- [ ] Account created at railway.app
- [ ] GitHub repository connected
- [ ] PostgreSQL database added
- [ ] Environment variables configured:
  - [ ] JWT_SECRET
  - [ ] NODE_ENV=production
  - [ ] FRONTEND_URL
  - [ ] PORT=3000
- [ ] Root directory set to `server`
- [ ] Start command set to `node index.js`
- [ ] Database initialized with schema.sql

### Vercel (Frontend)
- [ ] Account created at vercel.com
- [ ] GitHub repository connected
- [ ] Framework set to Vite
- [ ] Root directory set to `client`
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Environment variable added:
  - [ ] VITE_API_URL=(Railway backend URL)

## Post-Deployment

- [ ] Frontend loads without errors
- [ ] Can create new account
- [ ] Can login with created account
- [ ] Can upload receipt image
- [ ] OCR extracts amount correctly
- [ ] Can save receipt
- [ ] Receipt appears in list
- [ ] Can delete receipt
- [ ] HTTPS works on both frontend and backend
- [ ] Mobile view works correctly
- [ ] Console shows no errors

## Monitoring & Maintenance

- [ ] Set up error logging (optional: Sentry)
- [ ] Monitor Railway logs for errors
- [ ] Set up database backups
- [ ] Document deployment process for team
- [ ] Plan for database migrations
- [ ] Set up health check endpoint (optional)

## Cost Management

- [ ] Understand Railway pricing ($5/month base)
- [ ] Understand Vercel limits (free tier)
- [ ] Monitor usage to avoid overages
- [ ] Consider auto-scaling needs

---

## Quick Commands Reference

### Test Build Locally
```bash
# Frontend
cd client
npm run build
npm run preview

# Backend
cd server
NODE_ENV=production node index.js
```

### Test OCR
```bash
cd server
node test_thermal_ocr.js path/to/receipt.jpg medium
```

### Database Migration
```bash
psql $DATABASE_URL -f schema.sql
```

### View Logs
```bash
# Railway: Click service → View Logs
# Vercel: Click project → View Logs
```

---

## Need Help?

- Railway Issues: Check `docs/DEPLOYMENT_GUIDE.md`
- OCR Problems: Check `docs/THERMAL_RECEIPT_OCR_GUIDE.md`
- Quick Deploy: Check `docs/QUICK_DEPLOY.md`

---

**Ready to deploy?** Follow [QUICK_DEPLOY.md](QUICK_DEPLOY.md) for step-by-step instructions.
