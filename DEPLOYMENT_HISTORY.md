# Deployment History & Troubleshooting

This document summarizes the deployment journey of the **Excel Data Manager** on Vercel and the technical resolutions applied to fix hosting issues.

## 🚀 Initial Strategy
Originally, the application was designed as a dual-process system (React frontend + Express Node.js backend). This works perfectly in local development and on platforms like Render.com.

## 🚩 The Vercel Challenge
When moving to **Vercel**, we encountered persistent **404 Errors** on all API routes (`/api/*`).
- **Cause**: Vercel is a serverless platform. It does not run a persistent background Node.js process by default. It serves the frontend as static files but "misses" the Express server.
- **Symptom**: Fetching datasets and submitting forms failed with 404 Syntax Errors (trying to parse HTML error pages as JSON).

## 🛠️ Technical Resolutions

### 1. Serverless Function Conversion
The backend was converted into a **Vercel Serverless Function**. 
- Created `api/index.js` as a bridge to export the Express `app`.
- Updated `backend/server.supabase.js` to export the app instance rather than just starting a listener.

### 2. Dependency Consolidation
Backend dependencies (ExcelJS, Supabase-js, etc.) were moved to the **root `package.json`**. 
- This allows Vercel to install all necessary modules in one environment during the build phase.

### 3. Vercel Routing (`vercel.json`)
A `vercel.json` file was implemented to handle request rewrites:
```json
{
    "rewrites": [
        { "source": "/api/(.*)", "destination": "/api/index.js" }
    ]
}
```
This ensures that any URL starting with `/api` is automatically routed to our serverless backend logic.

### 4. Environment Resilience
Updated the Supabase initialization to be non-blocking. Instead of calling `process.exit(1)` when environment variables are missing (which can crash a serverless cold start), the system now logs the error and remains responsive.

## ✅ Current Production State
- **Frontend**: Served as a high-performance static site from `frontend/dist`.
- **Backend**: Executed as an on-demand serverless function from `api/index.js`.
- **Database**: Securely connected to Supabase via secret environment variables.

---
*Created: January 2026*
