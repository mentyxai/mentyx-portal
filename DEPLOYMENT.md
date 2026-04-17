# 🚀 Mentyx Borrower Portal - Complete Deployment Guide

## What You're Getting

A **100% working** borrower portal:
- ✅ User authentication (signup/login)
- ✅ Dashboard with loan history & stats
- ✅ Loan applications (DSCR, Fix & Flip, Bridge)
- ✅ Real-time DSCR/LTV/LTC calculators
- ✅ Auto-save (every keystroke)
- ✅ Real file upload to Supabase Storage
- ✅ Document status tracking
- ✅ Loan detail pages with status timeline
- ✅ Message center
- ✅ Email notifications
- ✅ Mobile responsive
- ✅ Focus DSCR branding

**Time: ~30 minutes**

---

## Step 1: Supabase Setup (10 min)

### 1.1 Create Project
1. Go to [supabase.com](https://supabase.com) → Sign up
2. Click **"New Project"**
3. Enter:
   - Name: `mentyx-portal`
   - Password: Generate & **SAVE IT**
   - Region: `us-east-1`
4. Click **"Create"** → Wait 2 min

### 1.2 Get API Keys
1. Go to **Settings → API**
2. Copy & save:
   - **Project URL**
   - **anon public** key
   - **service_role** key (click Reveal)

### 1.3 Run Database Schema
1. Go to **SQL Editor**
2. Click **"New query"**
3. Paste entire contents of `database/schema.sql`
4. Click **"Run"**
5. Should see: `Success. No rows returned`

### 1.4 Create Storage Bucket
1. Go to **Storage**
2. Click **"New bucket"**
3. Name: `documents`
4. Public: **OFF**
5. Click **"Create"**

### 1.5 Set Storage Policies
1. Click `documents` bucket → **Policies**
2. Click **"New Policy"** → **"For full customization"**

**Policy 1 - Upload:**
- Name: `Allow uploads`
- Allowed operation: `INSERT`
- Policy: `true`

**Policy 2 - Select:**
- Name: `Allow downloads`
- Allowed operation: `SELECT`
- Policy: `true`

### 1.6 Auth Settings
1. Go to **Authentication → URL Configuration**
2. Site URL: `https://mentyx.app`

---

## Step 2: GitHub (5 min)

### 2.1 Create Repo
1. Go to [github.com](https://github.com) → **New repository**
2. Name: `mentyx-portal`
3. Private: Yes
4. Create

### 2.2 Push Code
```bash
cd mentyx-portal
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mentyx-portal.git
git push -u origin main
```

---

## Step 3: Vercel Deploy (10 min)

### 3.1 Import Project
1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New" → "Project"**
3. Import `mentyx-portal`

### 3.2 Environment Variables
Add ALL of these:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
NEXT_PUBLIC_APP_URL=https://mentyx.app
NEXT_PUBLIC_BRAND_NAME=Focus DSCR
NEXT_PUBLIC_DEMO_MODE=true
```

### 3.3 Deploy
Click **"Deploy"** → Wait 2 min

---

## Step 4: Domain (5 min)

### 4.1 Add in Vercel
1. Project → **Settings → Domains**
2. Add: `mentyx.app`

### 4.2 DNS Records
Add in Cloudflare/registrar:
- Type: `A`, Name: `@`, Value: `76.76.21.21`

---

## Step 5: Create Demo Data (5 min)

### Run Seed Script
```bash
cd mentyx-portal
cp .env.example .env.local
# Fill in your Supabase credentials
npm install
npm run db:seed
```

This creates:
- **Email:** demo@focusdscr.com
- **Password:** demo123456
- **Borrower:** Michael Chen
- **Loans:** 3 (2 funded, 1 in review)

---

## ✅ Done!

Go to `https://mentyx.app` and login with:
- **Email:** demo@focusdscr.com
- **Password:** demo123456

---

## Demo Flow

1. **Login** → Show saved credentials
2. **Dashboard** → Stats, loan history, profile
3. **New Loan** → DSCR calculator live
4. **Documents** → Upload works
5. **Submit** → Email sends
6. **Mobile** → Responsive

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Invalid API key | Check env vars in Vercel |
| Tables not found | Re-run schema.sql |
| Auth fails | Check Site URL in Supabase |
| Upload fails | Check storage policies |
