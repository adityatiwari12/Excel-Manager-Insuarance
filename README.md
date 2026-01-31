# Excel Data Manager

A high-performance, resilient web application for rapid data entry, management, and export. Designed for speed, accessibility, and data safety.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Tech Stack](https://img.shields.io/badge/Stack-React_Node_Supabase-blue)

## 🚀 Key Features

### ⚡ Efficient Data Entry
- **Vertical Form Layout**: Optimized for high-speed data entry with keyboard navigation.
- **Voice Input**: Integrated speech-to-text support for hands-free entry on supported browsers.
- **Smart Validation**: Instant feedback on required fields.

### 🛡️ Data Safety & Persistence
- **Supabase (PostgreSQL)**: Enterprise-grade database storage ensures your data is never lost.
- **Browser-Side Caching**:
  - **Auto-Save Drafts**: Form usage is saved to `localStorage` on every keystroke. Reloading the page restores your work instantly.
  - **Offline Read Access**: View your datasets and entries even without an internet connection (cached locally).
- **Graceful Error Handling**: Robust feedback system for network or server issues.

### ♿ Accessibility & UX
- **High Contrast Mode**: Toggle for improved visibility.
- **Dynamic Font Sizing**: Adjust text size for better readability.
- **Responsive Design**: Works on desktop, tablet, and mobile devices.

### 📊 Management & Export
- **Multi-Dataset Support**: Organize entries into distinct named datasets.
- **Excel Export**: Download datasets as formatted `.xlsx` files with automatic column sizing.
- **CRUD Operations**: Create, Read, Update, and Delete entries with ease.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Hooks + LocalStorage
- **HTTP Client**: Native Fetch API

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database Client**: `@supabase/supabase-js` (Official Client)
- **Excel Generation**: `exceljs`

### Database
- **Platform**: Supabase
- **Engine**: PostgreSQL
- **Schema**: Strongly typed with distinct columns (not JSON dumps)

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- npm
- A Supabase Project (See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))

### 1. Clone & Install
```bash
# Install root dependencies
npm install

# Install Frontend dependencies
cd frontend
npm install

# Install Backend dependencies
cd ../backend
npm install
```

### 2. Configure Environment
Create a `.env` file in the `backend/` directory:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=3001
```

### 3. Setup Database
Run the schema script provided in `database-schema.sql` in your Supabase SQL Editor.

### 4. Run Application
From the root directory:
```bash
npm run dev
```
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

---

## 🔮 Future Roadmap (Scalability & Improvements)

To take this application to the enterprise level, the following improvements are planned:

### 1. Security & Authentication
- **Supabase Auth Integration**: Replace open access with secure Login/Signup.
- **Row Level Security (RLS)**: Enforce data ownership (Users can only see their own datasets).
- **RBAC**: Implement Admin vs. Editor roles.

### 2. Scalability Architecture
- **Dockerization**: Containerize Backend and Frontend for consistent deployment.
- **Serverless Migration**: Move Express backend logic to **Supabase Edge Functions** to eliminate the need for a dedicated Node.js server.
- **Redis Caching**: Implement server-side caching for frequently accessed datasets.

### 3. Enhanced Features
- **Real-time Collaboration**: Use Supabase Realtime to allow multiple users to edit the same dataset simultaneously.
- **Advanced Validation**: Integrate `Zod` schema validation sharing between Frontend and Backend.
- **Bulk Import**: Allow uploading existing Excel files to populate the database.

### 4. DevOps & Quality
- **CI/CD Pipelines**: Automated testing and deployment (e.g., GitHub Actions).
- **Unit & E2E Testing**: Add Vitest for logic and Playwright for browser testing.
- **Monitoring**: Integreate Sentry for error tracking.

---

## 📂 Project Structure

```
excel-data-manager/
├── backend/                # Node.js Express Server
│   ├── server.supabase.js  # Main application logic
│   └── .env                # Secrets (GitIgnored)
├── frontend/               # React Vite App
│   ├── src/
│   │   ├── App.jsx         # Core UI & Logic
│   │   └── index.css       # Tailwind & Custom Styles
├── database-schema.sql     # SQL Source of Truth
└── SUPABASE_SETUP.md       # Setup Guide
```

---

*Verified and Active as of Jan 2026*
