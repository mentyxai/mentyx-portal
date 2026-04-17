# Mentyx Borrower Portal

A production-ready borrower portal for asset-based real estate lenders. Built for Focus DSCR.

## Features

- ✅ **Borrower Accounts** — Secure login, saved profiles, loan history
- ✅ **Smart Applications** — DSCR, Fix & Flip, and Bridge loan forms
- ✅ **Real-Time Calculators** — Live DSCR, LTV, LTC, LTARV calculations
- ✅ **Auto-Save** — Progress saves automatically, resume on any device
- ✅ **Document Management** — Upload checklist with profile docs reuse
- ✅ **Mobile Responsive** — Works on phone, tablet, and desktop
- ✅ **White-Label Ready** — Customizable branding

## Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Hosting:** Vercel

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Fill in your Supabase credentials in .env.local

# Run development server
npm run dev
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step deployment instructions.

## Demo Credentials

- **Email:** demo@focusdscr.com
- **Password:** demo123456

## Project Structure

```
mentyx-portal/
├── app/
│   ├── page.tsx              # Login page
│   ├── dashboard/            # Protected dashboard
│   ├── apply/                # Loan application flow
│   └── api/                  # Backend endpoints
├── components/               # React components
├── lib/                      # Utilities & Supabase client
├── database/
│   └── schema.sql           # Database schema
└── DEPLOYMENT.md            # Deployment guide
```

## License

Proprietary - Mentyx Technologies LLC
