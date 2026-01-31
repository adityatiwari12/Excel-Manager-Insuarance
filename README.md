# Excel Data Manager

A web application for fast vertical form-based data entry that converts data into structured, multi-sheet Excel spreadsheets.

## Features

- **Vertical Form Layout**: Optimized for fast data entry with keyboard navigation
- **Multiple Datasets**: Create and manage multiple datasets, each representing an Excel sheet
- **Excel Export**: Generate a single .xlsx file with multiple worksheets
- **No Page Reloads**: Smooth, single-page application experience
- **Responsive Design**: Clean, minimal interface that works on desktop and mobile

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Excel Generation**: ExcelJS

## Installation

1. Install dependencies for all projects:
```bash
npm run install:all
```

Or install separately:
```bash
# Root dependencies
npm install

# Frontend dependencies
cd frontend
npm install

# Backend dependencies
cd ../backend
npm install
```

## Running the Application

From the root directory, run both frontend and backend concurrently:

```bash
npm run dev
```

Or run separately:

```bash
# Terminal 1 - Frontend (runs on http://localhost:3000)
npm run dev:frontend

# Terminal 2 - Backend (runs on http://localhost:3001)
npm run dev:backend
```

## Usage

1. **Select or Create Dataset**: Choose an existing dataset from the dropdown or enter a new dataset name
2. **Enter Data**: Fill in all fields from top to bottom
   - Press Enter to move to the next field
   - All fields are required
3. **Submit**: Click Submit to append the data to the selected dataset
4. **Download**: Click "Download Excel File" to export all datasets as a single Excel file

## Data Fields

- Serial Number
- Case Number
- Policy Number
- Claim Number
- Vehicle Number
- Court
- Title
- FIR Number
- Date
- Date of Accident

## Project Structure

```
excel-data-manager/
├── frontend/          # React application
│   ├── src/
│   │   ├── App.jsx    # Main application component
│   │   ├── main.jsx   # Entry point
│   │   └── index.css  # Global styles
│   └── package.json
├── backend/           # Express server
│   ├── server.js      # API server
│   └── package.json
└── package.json       # Root package.json with scripts
```

## API Endpoints

- `GET /api/datasets` - Get list of all datasets
- `POST /api/submit` - Submit form data to a dataset
- `GET /api/export` - Download Excel file with all datasets

## Notes

- Data is stored in-memory (resets on server restart)
- Each dataset maps to one worksheet in the Excel file
- Data is appended row-by-row, never overwritten
- All fields are required for submission
