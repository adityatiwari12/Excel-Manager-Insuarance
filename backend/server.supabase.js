import express from 'express';
import cors from 'cors';
import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

// Helper function to convert camelCase to snake_case
function toSnakeCase(str) {
  if (str === 'date') return 'date_of_fir';
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Helper function to convert snake_case to camelCase
function toCamelCase(str) {
  if (str === 'date_of_fir') return 'date';
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Helper function to convert object keys from camelCase to snake_case
function objectToSnakeCase(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toSnakeCase(key)] = value;
  }
  return result;
}

// Helper function to convert object keys from snake_case to camelCase
function objectToCamelCase(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'id' || key === 'created_at' || key === 'updated_at') {
      result[key === 'created_at' ? 'createdAt' : key === 'updated_at' ? 'updatedAt' : key] = value;
    } else {
      result[toCamelCase(key)] = value;
    }
  }
  return result;
}

// Get all datasets
app.get('/api/datasets', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('entries')
      .select('dataset_name')
      .order('dataset_name');

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Get unique dataset names
    const uniqueDatasets = [...new Set(data.map(row => row.dataset_name))];
    res.json({ datasets: uniqueDatasets });
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

    // Prepare entry data
    const entryData = objectToSnakeCase(data);
    entryData.dataset_name = dataset;

    // Insert into Supabase
    const { error } = await supabase
      .from('entries')
      .insert([entryData]);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to save data' });
    }

    // Get row count for this dataset
    const { count, error: countError } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('dataset_name', dataset);

    res.json({
      success: true,
      message: 'Data submitted successfully',
      dataset: dataset,
      rowCount: count || 0
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get entries for a specific dataset
app.get('/api/datasets/:datasetName/entries', async (req, res) => {
  try {
    const { datasetName } = req.params;

    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('dataset_name', datasetName)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Convert snake_case to camelCase for frontend
    const entries = data.map(entry => objectToCamelCase(entry));

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

    // Prepare update data
    const updateData = objectToSnakeCase(data);
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('entries')
      .update(updateData)
      .eq('id', entryId)
      .eq('dataset_name', datasetName);

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: 'Failed to update entry' });
    }

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
app.delete('/api/datasets/:datasetName/entries/:entryId', async (req, res) => {
  try {
    const { datasetName, entryId } = req.params;

    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', entryId)
      .eq('dataset_name', datasetName);

    if (error) {
      console.error('Supabase delete error:', error);
      return res.status(500).json({ error: 'Failed to delete entry' });
    }

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

    let datasetNames;

    if (dataset) {
      datasetNames = [dataset];
    } else {
      // Get all unique dataset names
      const { data, error } = await supabase
        .from('entries')
        .select('dataset_name');

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Database error' });
      }

      datasetNames = [...new Set(data.map(row => row.dataset_name))];
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

      // Get data for this dataset
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('dataset_name', datasetName)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        continue;
      }

      // Add data rows
      for (const entry of data) {
        const row = FIELD_ORDER.map(field => entry[toSnakeCase(field)] || '');
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Connected to Supabase');
});
