# NICK OS — PRODUCTION DEPLOYMENT GUIDE

This document details the exact, repeatable procedures for deploying NICK OS into a secure, highly available production environment on **Google Cloud Run** or any standard container platform.

---

## 1. Environment Matrix

| Variable | Scope | Required | Example / Description |
|---|---|---|---|
| `NODE_ENV` | Server | Yes | `production` |
| `PORT` | Server | Yes | `3000` (Container ingress port) |
| `APP_URL` | Server | Yes | `https://your-custom-domain.com` |
| `GEMINI_API_KEY` | Server | Yes | Google AI Studio API Key for AI Brain |
| `CRON_SECRET` | Server | Yes | Random 32+ character hex string for securing `/api/cron/*` |
| `VITE_SUPABASE_URL` | Client | Optional | `https://xyzproject.supabase.co` |
| `VITE_SUPABASE_ANON_KEY`| Client | Optional | Public anonymous API key for Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Optional | Administrative service role key for backend crons |
| `VITE_GOOGLE_CLIENT_ID` | Client | Optional | `xxxx.apps.googleusercontent.com` for Calendar/Tasks |
| `VAPID_PUBLIC_KEY` | Server/Client | Optional | Web Push public key |
| `VAPID_PRIVATE_KEY` | Server | Optional | Web Push private key |
| `VAPID_SUBJECT` | Server | Optional | `mailto:admin@your-domain.com` |

---

## 2. Database Provisioning & Migrations (Supabase)

### 2.1 Step 1: Create Supabase Project
1. Log in to [Supabase Console](https://supabase.com/dashboard).
2. Create a new project (e.g. `nick-os-production`).
3. Select your closest geographical region (e.g. `eu-west-1` or `us-central1`).
4. Set a strong database password and copy the project reference.

### 2.2 Step 2: Apply Database Schema & Migrations
Execute the SQL migrations in order via the Supabase SQL Editor or Supabase CLI:

```bash
# Using Supabase CLI:
supabase db push

# Or via SQL Editor: execute files in /supabase/migrations/ in sequential order:
# 1. /supabase/migrations/20260921000001_initial_nick_os_data_foundation.sql
# 2. /supabase/migrations/20260921000002_minimal_seed_data.sql
# 3. /supabase/migrations/20260921000003_advanced_performance_indexes.sql
# 4. /supabase/migrations/20260921000004_notifications_and_audit_logs.sql
```

Verify that all tables have Row Level Security (RLS) enabled:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

---

## 3. Google Workspace OAuth Setup (Calendar & Tasks)

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services > Credentials**.
3. Enable the **Google Calendar API** and **Google Tasks API**.
4. Configure the **OAuth Consent Screen**:
   - User Type: External (or Internal if using Google Workspace domain).
   - Scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/tasks`
5. Create an **OAuth 2.0 Client ID**:
   - Application type: **Web application**.
   - Name: `NICK OS Web Client`.
   - **Authorized JavaScript origins**:
     - `https://your-custom-domain.com`
     - `https://ais-dev-llp7yuo6blrmzcmupduiip-581043318601.europe-west1.run.app`
6. Copy the **Client ID** and set it as `VITE_GOOGLE_CLIENT_ID` in your build environment.

---

## 4. Google Cloud Run Deployment

### 4.1 Step 1: Build & Push Container Image
Using Google Cloud SDK (`gcloud`) or Cloud Build:

```bash
# Set variables
PROJECT_ID="your-gcp-project-id"
REGION="europe-west1"
SERVICE_NAME="nick-os"

# Configure Docker credentials
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build and tag image
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/nick-os-repo/app:v1.0.0 .

# Push image to Artifact Registry
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/nick-os-repo/app:v1.0.0
```

### 4.2 Step 2: Deploy Service to Cloud Run
```bash
gcloud run deploy ${SERVICE_NAME} \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/nick-os-repo/app:v1.0.0 \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 3000 \
  --cpu 1 \
  --memory 512Mi \
  --min-instances 1 \
  --max-instances 5 \
  --set-env-vars "NODE_ENV=production,PORT=3000" \
  --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest,CRON_SECRET=NICK_CRON_SECRET:latest"
```

> **Production Tip:** Setting `--min-instances 1` ensures zero cold-start latency for focus stopwatch sessions, notifications, and real-time cockpit queries.

---

## 5. Automated Cloud Schedulers (Cron Jobs)

Set up Google Cloud Scheduler to trigger the sovereign background jobs every minute:

```bash
# Periodic Notification & Stale Session Scheduler (Every Minute)
gcloud scheduler jobs create http nick-os-heartbeat-cron \
  --schedule="* * * * *" \
  --uri="https://your-custom-domain.com/api/cron/all" \
  --http-method=POST \
  --headers="x-cron-secret=YOUR_CRON_SECRET,Content-Type=application/json" \
  --message-body='{}' \
  --time-zone="Europe/London"

# Daily Accountability Review Generation (Every night at 21:00)
gcloud scheduler jobs create http nick-os-daily-review-cron \
  --schedule="0 21 * * *" \
  --uri="https://your-custom-domain.com/api/cron/daily-accountability" \
  --http-method=POST \
  --headers="x-cron-secret=YOUR_CRON_SECRET,Content-Type=application/json" \
  --message-body='{}' \
  --time-zone="Europe/London"
```

---

## 6. Custom Domain & HTTPS Configuration

1. In Cloud Run console, navigate to **Custom Domains > Add Mapping**.
2. Select your service (`nick-os`) and specify your domain (e.g. `os.nick.com`).
3. Add the generated DNS CNAME or A records to your DNS provider (Cloudflare, Google Domains, etc.).
4. Google Cloud Run automatically provisions and renews managed SSL certificates within 15 minutes.

---

## 7. Verification & Smoke Test

Once deployed, verify the deployment:
```bash
# 1. Health check verification
curl -f https://your-custom-domain.com/api/health

# 2. Verify Cron authorization
curl -i -X POST https://your-custom-domain.com/api/cron/all \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" -d '{}'
```
Both requests should return HTTP 200 with structured JSON confirmations.
