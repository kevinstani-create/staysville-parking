# Staysville Parking - Production-Ready Booking System

A complete parking booking system built with Next.js 14, TypeScript, PostgreSQL, and Stripe integration.

## Features

- **3 Parking Locations**: Jens Zetlitz gate, Saudagata, Torbjørn Hornkløves gate
- **Stripe Payment Integration**: Secure checkout with webhook handling
- **Capacity Management**: Saudagata limited to 2 overlapping bookings
- **Admin Dashboard**: Real-time stats and booking management with Basic Auth
- **PostgreSQL Database**: Production-ready with proper indexing
- **Rate Limiting**: 10 requests per minute per IP on booking endpoint
- **Structured Logging**: JSON logs with PII protection

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + App Router + Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Neon Postgres (eu-central-1) with SSL
- **Payments**: Stripe Checkout + Webhooks
- **Deployment**: Vercel

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-username/staysville-parking.git
cd staysville-parking
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Database Setup

#### Create Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Create new project in **eu-central-1** (Frankfurt)
3. Enable connection pooler
4. Copy the pooled connection string (includes `?sslmode=require`)

#### Initialize Database

```bash
# Connect to your Neon database and run:
psql "your-neon-connection-string" -f scripts/init-db.sql
```

### 4. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your values:

```env
# Database (Neon Postgres pooled URL)
DATABASE_URL=postgresql://username:password@ep-example-123456.eu-central-1.aws.neon.tech/staysville_parking?sslmode=require

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Admin (Optional)
ADMIN_USER=staysville
ADMIN_PASS=choose-a-strong-password
```

### 5. Stripe Webhook Setup

#### Development

```bash
# Install Stripe CLI
stripe listen --forward-to http://localhost:3000/api/webhook

# Copy the webhook secret to .env.local
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Production

1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-vercel-domain.vercel.app/api/webhook`
3. Select event: `checkout.session.completed`
4. Copy webhook secret to Vercel environment variables

### 6. Run Development Server

```bash
bun dev
```

Visit `http://localhost:3000`

## Deployment to Vercel

### 1. Import from GitHub

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Framework: **Next.js**
5. Root Directory: `./` (default)

### 2. Environment Variables

Add these in Vercel Project Settings → Environment Variables:

```
DATABASE_URL=postgresql://username:password@ep-example-123456.eu-central-1.aws.neon.tech/staysville_parking?sslmode=require
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_BASE_URL=https://your-vercel-domain.vercel.app
ADMIN_USER=staysville
ADMIN_PASS=your-secure-password
```

### 3. Deploy

Click "Deploy" - Vercel will automatically build and deploy.

### 4. Configure Stripe Webhook (Production)

1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-vercel-domain.vercel.app/api/webhook`
3. Select event: `checkout.session.completed`
4. Copy the webhook secret
5. Update `STRIPE_WEBHOOK_SECRET` in Vercel environment variables
6. Redeploy if needed

## API Endpoints

- `POST /api/booking` - Create booking and Stripe checkout session
- `POST /api/webhook` - Handle Stripe webhook events
- `GET /api/admin/bookings` - Admin dashboard data (Basic Auth)

## Routes

- `/` - Homepage with location cards
- `/booking/jens-zetlitz-gate` - Booking form for Jens Zetlitz gate
- `/booking/saudagata` - Booking form for Saudagata
- `/booking/torbjorn-hornkloves-gate` - Booking form for Torbjørn Hornkløves gate
- `/success?session_id=...` - Payment success page
- `/admin` - Admin dashboard (Basic Auth protected)

## Business Rules

- **Pricing**: 150 NOK per night
- **Minimum**: 1 night booking
- **Capacity**: Saudagata max 2 cars per overlapping dates
- **Required Fields**: Full Name, Email, Start Date, End Date
- **Optional**: License Plate (with "no license plate" checkbox)

## Database Schema

```sql
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    license_plate TEXT NULL,
    no_license_plate BOOLEAN DEFAULT FALSE,
    location TEXT NOT NULL CHECK (location IN ('jens-zetlitz-gate', 'saudagata', 'torbjorn-hornkloves-gate')),
    total_price INTEGER NOT NULL, -- NOK in øre
    stripe_payment_intent_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Security Features

- **Rate Limiting**: 10 requests/minute/IP on booking endpoint
- **Input Validation**: Comprehensive validation on all inputs
- **PII Protection**: Logs only show last 4 digits of license plates
- **Basic Auth**: Admin dashboard protection
- **Stripe Webhook Verification**: Cryptographic signature validation
- **SQL Injection Protection**: Parameterized queries

## Monitoring & Logging

All API endpoints log structured JSON to console:

```json
{
  "bookingId": 123,
  "location": "jens-zetlitz-gate",
  "nights": 2,
  "totalPrice": 300,
  "sessionId": "cs_...",
  "timestamp": "2025-09-26T02:30:00.000Z"
}
```

## Admin Dashboard

Access: `/admin` (requires Basic Auth if configured)

Features:
- Total bookings, completed, pending counts
- Total revenue calculation
- Bookings by location
- Complete booking list with customer details
- Real-time refresh capability

## Norwegian Character Support

The system properly handles Norwegian characters (Ø) in:
- **Torbjørn Hornkløves gate** (location name)
- Database storage and retrieval
- UI display across all components

## Support

For issues or questions:
1. Check the logs in Vercel Functions tab
2. Verify environment variables are set correctly
3. Ensure Stripe webhook endpoint is configured
4. Check database connectivity

## License

MIT License - see LICENSE file for details.
