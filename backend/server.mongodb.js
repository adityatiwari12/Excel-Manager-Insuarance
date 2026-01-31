import express from 'express';
import cors from 'cors';
import ExcelJS from 'exceljs';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
let db;
let client;

async function connectToMongoDB() {
  try {
    if (!MONGODB_URI) {
      console.warn('MONGODB_URI not set. Using in-memory storage. Set MONGODB_URI in .env to use MongoDB.');
      return null;
    }

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();
    console.log('Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.warn('Falling back to in-memory storage');
    return null;
  }
}

// Initialize MongoDB connection
const mongoDb = await connectToMongoDB();

// Field order matching frontend
const FIELD_ORDER = [
  'serialNumber',
  'caseNumber',
  'policyNumber',
  'claimNumber',
  'vehicleNumber',
  'court',
  'title',
  'firNumber',
  'date',
  'dateOfAccident'
];

const FIELD_LABELS = {
  serialNumber: 'Serial Number',
  caseNumber: 'Case Number',
  policyNumber: 'Policy Number',
  claimNumber: 'Claim Number',
  vehicleNumber: 'Vehicle Number',
  court: 'Court',
  title: 'Title',
  firNumber: 'FIR Number',
  date: 'Date of FIR',
  dateOfAccident: 'Date of Accident'
};

// Required fields only
const REQUIRED_FIELDS = [
  'serialNumber',
  'policyNumber',
  'claimNumber',
  'vehicleNumber',
  'title',
  'date'
];

// In-memory fallback storage (if MongoDB not available)
const datasets = {};
let nextId = 1;

// Helper function to get dataset names
async function getDatasetNames() {
  if (mongoDb) {
    const entries = await mongoDb.collection('entries').distinct('datasetName');
    return entries;
  }
  return Object.keys(datasets);
}

// Helper function to get entries for a dataset
async function getDatasetEntries(datasetName) {
  if (mongoDb) {
    const entries = await mongoDb.collection('entries')
      .find({ datasetName })
      .sort({ createdAt: 1 })
      .toArray();
    return entries.map(entry => ({
      id: entry._id.toString(),
      ...entry
    }));
  }
  return datasets[datasetName]?.map(entry => ({
    id: entry.id,
    ...Object.fromEntries(FIELD_ORDER.map((field, index) => [field, entry.data[index] || '']))
  })) || [];
}

// In-memory fallback storage (if MongoDB not available)
const datasets = {};
let nextId = 1;

// Get all datasets
app.get('/api/datasets', async (req, res) => {
  try {
    const datasetNames = await getDatasetNames();
    res.json({ datasets: datasetNames });
  } catch (error) {
    console.error('Get datasets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit data
app.post('/api/submit', async (req, res) => {
  try {
    const { dataset, data } = req.body;

    if (!dataset || !dataset.trim()) {
      return res.status(400).json({ error: 'Dataset name is required' });
    }

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    // Validate only required fields are present
    const missingFields = REQUIRED_FIELDS.filter(field => !data[field] || data[field].trim() === '');
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.map(f => FIELD_LABELS[f]).join(', ')}` 
      });
    }

    if (mongoDb) {
      // MongoDB storage
      const entry = {
        datasetName: dataset,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await mongoDb.collection('entries').insertOne(entry);
      
      const count = await mongoDb.collection('entries').countDocuments({ datasetName: dataset });
      
      res.json({ 
        success: true, 
        message: 'Data submitted successfully',
        dataset: dataset,
        rowCount: count
      });
    } else {
      // In-memory storage
      if (!datasets[dataset]) {
        datasets[dataset] = [];
      }

      const row = FIELD_ORDER.map(field => data[field] || '');
      datasets[dataset].push({
        id: nextId++,
        data: row
      });

      res.json({ 
        success: true, 
        message: 'Data submitted successfully',
        dataset: dataset,
        rowCount: datasets[dataset].length
      });
    }
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get entries for a specific dataset
app.get('/api/datasets/:datasetName/entries', async (req, res) => {
  try {
    const { datasetName } = req.params;
    const entries = await getDatasetEntries(datasetName);
    res.json({ entries });
  } catch (error) {
    console.error('Get entries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an entry
app.put('/api/datasets/:datasetName/entries/:entryId', async (req, res) => {
  try {
    const { datasetName, entryId } = req.params;
    const { data } = req.body;

    // Validate only required fields
    const missingFields = REQUIRED_FIELDS.filter(field => !data[field] || data[field].trim() === '');
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.map(f => FIELD_LABELS[f]).join(', ')}` 
      });
    }

    if (mongoDb) {
      const result = await mongoDb.collection('entries').updateOne(
        { _id: new ObjectId(entryId), datasetName },
        { 
          $set: { 
            ...data,
            updatedAt: new Date()
          } 
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      res.json({ 
        success: true, 
        message: 'Entry updated successfully'
      });
    } else {
      if (!datasets[datasetName]) {
        return res.status(404).json({ error: 'Dataset not found' });
      }

      const entryIndex = datasets[datasetName].findIndex(e => e.id === parseInt(entryId));
      if (entryIndex === -1) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      const row = FIELD_ORDER.map(field => data[field] || '');
      datasets[datasetName][entryIndex].data = row;

      res.json({ 
        success: true, 
        message: 'Entry updated successfully'
      });
    }
  } catch (error) {
    console.error('Update entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an entry
app.delete('/api/datasets/:datasetName/entries/:entryId', async (req, res) => {
  try {
    const { datasetName, entryId } = req.params;

    if (mongoDb) {
      const result = await mongoDb.collection('entries').deleteOne({
        _id: new ObjectId(entryId),
        datasetName
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      res.json({ 
        success: true, 
        message: 'Entry deleted successfully'
      });
    } else {
      if (!datasets[datasetName]) {
        return res.status(404).json({ error: 'Dataset not found' });
      }

      const entryIndex = datasets[datasetName].findIndex(e => e.id === parseInt(entryId));
      if (entryIndex === -1) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      datasets[datasetName].splice(entryIndex, 1);

      res.json({ 
        success: true, 
        message: 'Entry deleted successfully'
      });
    }
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export to Excel
app.get('/api/export', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const { dataset } = req.query;
    
    let datasetNames;
    if (mongoDb) {
      datasetNames = dataset 
        ? [dataset]
        : await mongoDb.collection('entries').distinct('datasetName');
    } else {
      datasetNames = dataset ? [dataset] : Object.keys(datasets);
    }
    
    if (datasetNames.length === 0) {
      return res.status(400).json({ error: 'No data to export' });
    }

    // Create headers array
    const headers = FIELD_ORDER.map(field => FIELD_LABELS[field]);

    // Create a worksheet for each dataset
    for (const datasetName of datasetNames) {
      const worksheet = workbook.addWorksheet(datasetName);
      
      // Add headers
      worksheet.addRow(headers);
      
      // Style headers
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      // Add data rows
      let entries;
      if (mongoDb) {
        const dbEntries = await mongoDb.collection('entries')
          .find({ datasetName })
          .sort({ createdAt: 1 })
          .toArray();
        entries = dbEntries.map(entry => 
          FIELD_ORDER.map(field => entry[field] || '')
        );
      } else {
        entries = datasets[datasetName].map(entry => entry.data);
      }
      
      for (const row of entries) {
        worksheet.addRow(row);
      }
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 20;
      });
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set response headers
    const filename = dataset ? `${dataset}-export.xlsx` : 'data-export.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Error generating Excel file' });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (mongoDb) {
    console.log('Using MongoDB for data storage');
  } else {
    console.log('Using in-memory storage (set MONGODB_URI to use MongoDB)');
  }
});
