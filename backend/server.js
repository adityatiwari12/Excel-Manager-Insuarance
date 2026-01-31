import express from 'express';
import cors from 'cors';
import ExcelJS from 'exceljs';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory data storage
// Structure: { datasetName: [{id, data: [values...]}, ...] }
const datasets = {};
let nextId = 1;

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

// Get all datasets
app.get('/api/datasets', (req, res) => {
  res.json({ datasets: Object.keys(datasets) });
});

// Submit data
app.post('/api/submit', (req, res) => {
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

    // Initialize dataset if it doesn't exist
    if (!datasets[dataset]) {
      datasets[dataset] = [];
    }

    // Create row in correct order
    const row = FIELD_ORDER.map(field => data[field] || '');

    // Append row with ID (never overwrite)
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
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get entries for a specific dataset
app.get('/api/datasets/:datasetName/entries', (req, res) => {
  try {
    const { datasetName } = req.params;
    
    if (!datasets[datasetName]) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const entries = datasets[datasetName].map(entry => {
      const entryData = {};
      FIELD_ORDER.forEach((field, index) => {
        entryData[field] = entry.data[index] || '';
      });
      return {
        id: entry.id,
        ...entryData
      };
    });

    res.json({ entries });
  } catch (error) {
    console.error('Get entries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an entry
app.put('/api/datasets/:datasetName/entries/:entryId', (req, res) => {
  try {
    const { datasetName, entryId } = req.params;
    const { data } = req.body;

    if (!datasets[datasetName]) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const entryIndex = datasets[datasetName].findIndex(e => e.id === parseInt(entryId));
    if (entryIndex === -1) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Validate only required fields
    const missingFields = REQUIRED_FIELDS.filter(field => !data[field] || data[field].trim() === '');
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.map(f => FIELD_LABELS[f]).join(', ')}` 
      });
    }

    // Update row
    const row = FIELD_ORDER.map(field => data[field] || '');
    datasets[datasetName][entryIndex].data = row;

    res.json({ 
      success: true, 
      message: 'Entry updated successfully'
    });
  } catch (error) {
    console.error('Update entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an entry
app.delete('/api/datasets/:datasetName/entries/:entryId', (req, res) => {
  try {
    const { datasetName, entryId } = req.params;

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
    
    let datasetNames = Object.keys(datasets);
    
    // If specific dataset requested, only export that one
    if (dataset) {
      if (!datasets[dataset]) {
        return res.status(404).json({ error: 'Dataset not found' });
      }
      datasetNames = [dataset];
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
      const entries = datasets[datasetName];
      for (const entry of entries) {
        worksheet.addRow(entry.data);
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
