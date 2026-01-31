# MongoDB Setup Guide

This guide will help you connect the Excel Data Manager application to MongoDB for persistent data storage.

## Prerequisites

Before setting up MongoDB, you'll need:

1. **MongoDB Account** (if using MongoDB Atlas cloud service)
   - OR
   - **MongoDB installed locally** on your machine

2. **Node.js** (already installed for this project)

3. **MongoDB Connection String** - You'll get this from:
   - MongoDB Atlas: Your cluster connection string
   - Local MongoDB: `mongodb://localhost:27017/excel-data-manager`

## What You Need to Provide

### Option 1: MongoDB Atlas (Cloud - Recommended)

1. **MongoDB Atlas Account**
   - Sign up at: https://www.mongodb.com/cloud/atlas/register
   - Create a free cluster (M0 tier is free)

2. **Connection String**
   - After creating a cluster, click "Connect"
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
   - Replace `<password>` with your database user password
   - Add database name: `mongodb+srv://username:password@cluster.mongodb.net/excel-data-manager`

3. **Database User Credentials**
   - Username
   - Password

4. **Network Access**
   - Add your IP address to the whitelist (or use 0.0.0.0/0 for development)

### Option 2: Local MongoDB

1. **Install MongoDB**
   - Download from: https://www.mongodb.com/try/download/community
   - Install and start MongoDB service
   - Default connection: `mongodb://localhost:27017/excel-data-manager`

2. **Connection String**
   - Use: `mongodb://localhost:27017/excel-data-manager`
   - Or if authentication is enabled: `mongodb://username:password@localhost:27017/excel-data-manager`

## Installation Steps

### Step 1: Install MongoDB Driver

```bash
cd backend
npm install mongodb
```

### Step 2: Create Environment File

Create a `.env` file in the `backend` directory:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/excel-data-manager
# OR for local:
# MONGODB_URI=mongodb://localhost:27017/excel-data-manager

PORT=3001
```

**Important:** Add `.env` to `.gitignore` to keep your credentials secure!

### Step 3: Install dotenv Package

```bash
cd backend
npm install dotenv
```

### Step 4: Update Backend Code

The backend code will need to be updated to:
- Connect to MongoDB on startup
- Store datasets and entries in MongoDB collections
- Replace in-memory storage with database operations

## Database Structure

The MongoDB database will have the following structure:

### Database: `excel-data-manager`

### Collection: `datasets`
Documents will look like:
```json
{
  "_id": ObjectId("..."),
  "name": "Dataset Name",
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

### Collection: `entries`
Documents will look like:
```json
{
  "_id": ObjectId("..."),
  "datasetName": "Dataset Name",
  "serialNumber": "...",
  "caseNumber": "...",
  "policyNumber": "...",
  "claimNumber": "...",
  "vehicleNumber": "...",
  "court": "...",
  "title": "...",
  "firNumber": "...",
  "date": "...",
  "dateOfAccident": "...",
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

## Migration from In-Memory to MongoDB

When migrating:
1. All existing in-memory data will be lost (unless you export it first)
2. Export current data to Excel before switching
3. After MongoDB setup, you can manually import data if needed

## Security Notes

1. **Never commit `.env` file** to version control
2. **Use environment variables** for all sensitive data
3. **Restrict network access** in MongoDB Atlas to your IP addresses
4. **Use strong passwords** for database users
5. **Enable authentication** even for local MongoDB in production

## Testing the Connection

After setup, you can test the connection by:
1. Starting the backend server
2. Checking console logs for "Connected to MongoDB" message
3. Submitting a test entry through the form
4. Verifying it appears in MongoDB Compass or Atlas

## Need Help?

- MongoDB Documentation: https://docs.mongodb.com/
- MongoDB Atlas Setup: https://docs.atlas.mongodb.com/getting-started/
- MongoDB Node.js Driver: https://docs.mongodb.com/drivers/node/

## Next Steps

Once you provide:
- MongoDB connection string
- Database credentials (if needed)

I can update the backend code to use MongoDB instead of in-memory storage.
