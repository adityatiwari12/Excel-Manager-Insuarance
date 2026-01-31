import { useState, useEffect, useRef } from 'react'
import './App.css'

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
]

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
}

// Required fields only
const REQUIRED_FIELDS = [
  'serialNumber',
  'policyNumber',
  'claimNumber',
  'vehicleNumber',
  'title',
  'date'
]

// Date fields that should use date picker
const DATE_FIELDS = ['date', 'dateOfAccident']

function App() {
  const [formData, setFormData] = useState({
    serialNumber: '',
    caseNumber: '',
    policyNumber: '',
    claimNumber: '',
    vehicleNumber: '',
    court: '',
    title: '',
    firNumber: '',
    date: '',
    dateOfAccident: ''
  })
  
  const [datasets, setDatasets] = useState([])
  const [selectedDataset, setSelectedDataset] = useState('')
  const [newDatasetName, setNewDatasetName] = useState('')
  const [errors, setErrors] = useState({})
  const [submitStatus, setSubmitStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState('form') // 'form' or 'manage'
  const [currentDatasetEntries, setCurrentDatasetEntries] = useState([])
  const [editingEntry, setEditingEntry] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const [activeVoiceField, setActiveVoiceField] = useState(null)
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('fontSize')
    return saved ? parseInt(saved) : 16
  })
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('highContrast') === 'true'
  })
  
  const inputRefs = useRef({})
  const recognitionRef = useRef(null)

  useEffect(() => {
    fetchDatasets()
    initializeSpeechRecognition()
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--font-size-base', `${fontSize}px`)
    localStorage.setItem('fontSize', fontSize.toString())
  }, [fontSize])

  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }
    localStorage.setItem('highContrast', highContrast.toString())
  }, [highContrast])

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 24))
  }

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 12))
  }

  const resetFontSize = () => {
    setFontSize(16)
  }

  useEffect(() => {
    if (selectedDataset && viewMode === 'manage') {
      fetchDatasetEntries(selectedDataset)
    }
  }, [selectedDataset, viewMode])

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        if (activeVoiceField) {
          handleInputChange(activeVoiceField, transcript)
        }
        setIsListening(false)
        setActiveVoiceField(null)
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        setActiveVoiceField(null)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }

  const startVoiceInput = (field) => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      setActiveVoiceField(null)
      return
    }

    setActiveVoiceField(field)
    setIsListening(true)
    recognitionRef.current.start()
  }

  const fetchDatasets = async () => {
    try {
      const response = await fetch('/api/datasets')
      const data = await response.json()
      setDatasets(data.datasets || [])
    } catch (error) {
      console.error('Error fetching datasets:', error)
    }
  }

  const fetchDatasetEntries = async (datasetName) => {
    try {
      const response = await fetch(`/api/datasets/${encodeURIComponent(datasetName)}/entries`)
      const data = await response.json()
      setCurrentDatasetEntries(data.entries || [])
    } catch (error) {
      console.error('Error fetching entries:', error)
      setCurrentDatasetEntries([])
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
    setSubmitStatus(null)
  }

  const handleKeyDown = (e, currentField) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const currentIndex = FIELD_ORDER.indexOf(currentField)
      if (currentIndex < FIELD_ORDER.length - 1) {
        const nextField = FIELD_ORDER[currentIndex + 1]
        inputRefs.current[nextField]?.focus()
      } else {
        handleSubmit(e)
      }
    }
  }

  const validateForm = () => {
    const newErrors = {}
    // Only validate required fields
    REQUIRED_FIELDS.forEach(field => {
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = `${FIELD_LABELS[field]} is required`
      }
    })
    
    if (!selectedDataset && !newDatasetName.trim()) {
      newErrors.dataset = 'Please select or create a dataset'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const datasetName = selectedDataset || newDatasetName.trim()
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataset: datasetName,
          data: formData
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        setSubmitStatus({ type: 'success', message: 'Data submitted successfully!' })
        setFormData({
          serialNumber: '',
          caseNumber: '',
          policyNumber: '',
          claimNumber: '',
          vehicleNumber: '',
          court: '',
          title: '',
          firNumber: '',
          date: '',
          dateOfAccident: ''
        })
        setNewDatasetName('')
        await fetchDatasets()
        if (!datasets.includes(datasetName)) {
          setSelectedDataset(datasetName)
        }
        if (viewMode === 'manage') {
          await fetchDatasetEntries(datasetName)
        }
        inputRefs.current[FIELD_ORDER[0]]?.focus()
      } else {
        setSubmitStatus({ type: 'error', message: result.error || 'Failed to submit data' })
      }
    } catch (error) {
      setSubmitStatus({ type: 'error', message: 'Network error. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (entry) => {
    setEditingEntry(entry)
    const entryData = {}
    FIELD_ORDER.forEach(field => {
      entryData[field] = entry[field] || ''
    })
    setFormData(entryData)
    setViewMode('form')
    inputRefs.current[FIELD_ORDER[0]]?.focus()
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const response = await fetch(`/api/datasets/${encodeURIComponent(selectedDataset)}/entries/${editingEntry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: formData
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        setSubmitStatus({ type: 'success', message: 'Entry updated successfully!' })
        setEditingEntry(null)
        setFormData({
          serialNumber: '',
          caseNumber: '',
          policyNumber: '',
          claimNumber: '',
          vehicleNumber: '',
          court: '',
          title: '',
          firNumber: '',
          date: '',
          dateOfAccident: ''
        })
        await fetchDatasetEntries(selectedDataset)
        setViewMode('manage')
      } else {
        setSubmitStatus({ type: 'error', message: result.error || 'Failed to update entry' })
      }
    } catch (error) {
      setSubmitStatus({ type: 'error', message: 'Network error. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return
    }

    try {
      const response = await fetch(`/api/datasets/${encodeURIComponent(selectedDataset)}/entries/${entryId}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      
      if (response.ok) {
        await fetchDatasetEntries(selectedDataset)
      } else {
        alert(result.error || 'Failed to delete entry')
      }
    } catch (error) {
      alert('Network error. Please try again.')
      console.error('Delete error:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingEntry(null)
    setFormData({
      serialNumber: '',
      caseNumber: '',
      policyNumber: '',
      claimNumber: '',
      vehicleNumber: '',
      court: '',
      title: '',
      firNumber: '',
      date: '',
      dateOfAccident: ''
    })
    setErrors({})
    setSubmitStatus(null)
  }

  const handleDownload = async (datasetName = null) => {
    try {
      const url = datasetName 
        ? `/api/export?dataset=${encodeURIComponent(datasetName)}`
        : '/api/export'
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = datasetName ? `${datasetName}-export.xlsx` : 'data-export.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (error) {
      alert('Error downloading file. Please try again.')
      console.error('Download error:', error)
    }
  }

  return (
    <div className={`min-h-screen ${highContrast ? 'bg-white' : 'bg-gray-50'} py-8 px-4`}>
      <div className="max-w-6xl mx-auto">

        {/* Navigation Tabs */}
        <div className={`${highContrast ? 'bg-white border-2 border-black' : 'bg-white'} rounded-lg shadow-sm p-2 mb-6`} role="tablist" aria-label="Application modes">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setViewMode('form')
                setEditingEntry(null)
                handleCancelEdit()
              }}
              role="tab"
              aria-selected={viewMode === 'form'}
              aria-controls="form-panel"
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors border-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                viewMode === 'form'
                  ? highContrast 
                    ? 'bg-black text-white border-black'
                    : 'bg-blue-700 text-white border-blue-700'
                  : highContrast
                    ? 'bg-white text-black border-black hover:bg-gray-100'
                    : 'bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200'
              }`}
            >
              Data Entry
            </button>
            <button
              onClick={() => {
                setViewMode('manage')
                if (selectedDataset) {
                  fetchDatasetEntries(selectedDataset)
                }
              }}
              role="tab"
              aria-selected={viewMode === 'manage'}
              aria-controls="manage-panel"
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors border-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                viewMode === 'manage'
                  ? highContrast 
                    ? 'bg-black text-white border-black'
                    : 'bg-blue-700 text-white border-blue-700'
                  : highContrast
                    ? 'bg-white text-black border-black hover:bg-gray-100'
                    : 'bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200'
              }`}
            >
              Manage Datasets
            </button>
          </div>
        </div>

        {/* Dataset Selector */}
        <div className={`${highContrast ? 'bg-white border-2 border-black' : 'bg-white'} rounded-lg shadow-sm p-6 mb-6`}>
          <label htmlFor="dataset-select" className={`block text-sm font-medium mb-2 ${highContrast ? 'text-black' : 'text-gray-900'}`}>
            Dataset (Excel Sheet)
          </label>
          <div className="flex gap-4">
            <select
              id="dataset-select"
              value={selectedDataset}
              onChange={(e) => {
                setSelectedDataset(e.target.value)
                setNewDatasetName('')
                setErrors(prev => {
                  const newErrors = { ...prev }
                  delete newErrors.dataset
                  return newErrors
                })
                if (viewMode === 'manage' && e.target.value) {
                  fetchDatasetEntries(e.target.value)
                }
              }}
              className={`flex-1 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                highContrast 
                  ? 'border-2 border-black bg-white text-black'
                  : 'border-2 border-gray-800 bg-white text-gray-900'
              }`}
              aria-label="Select existing dataset"
            >
              <option value="">Select existing dataset...</option>
              {datasets.map(dataset => (
                <option key={dataset} value={dataset}>{dataset}</option>
              ))}
            </select>
            <div className="flex-1">
              <input
                type="text"
                value={newDatasetName}
                onChange={(e) => {
                  setNewDatasetName(e.target.value)
                  setSelectedDataset('')
                  setErrors(prev => {
                    const newErrors = { ...prev }
                    delete newErrors.dataset
                    return newErrors
                  })
                }}
                placeholder="Or create new dataset..."
                className={`w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                  highContrast 
                    ? 'border-2 border-black bg-white text-black placeholder-gray-600'
                    : 'border-2 border-gray-800 bg-white text-gray-900 placeholder-gray-500'
                }`}
                aria-label="Create new dataset name"
              />
            </div>
          </div>
          {errors.dataset && (
            <p className={`mt-1 text-sm font-semibold ${highContrast ? 'text-red-800' : 'text-red-700'}`} role="alert">{errors.dataset}</p>
          )}
        </div>

        {/* Form View */}
        {viewMode === 'form' && (
          <div role="tabpanel" id="form-panel" aria-labelledby="form-tab">
            <form onSubmit={editingEntry ? handleUpdate : handleSubmit} className={`${highContrast ? 'bg-white border-2 border-black' : 'bg-white'} rounded-lg shadow-sm p-6 mb-6`}>
              {editingEntry && (
                <div className={`mb-4 p-3 rounded-md border-2 ${
                  highContrast 
                    ? 'bg-gray-100 border-black'
                    : 'bg-blue-50 border-blue-300'
                }`}>
                  <p className={`text-sm font-semibold ${highContrast ? 'text-black' : 'text-blue-900'}`}>
                    <strong>Editing Entry ID:</strong> {editingEntry.id}
                  </p>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className={`mt-2 text-sm font-semibold underline focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                      highContrast 
                        ? 'text-black hover:text-gray-700'
                        : 'text-blue-700 hover:text-blue-900'
                    }`}
                  >
                    Cancel Edit
                  </button>
                </div>
              )}
              
              <div className="space-y-4">
                {FIELD_ORDER.map((field, index) => {
                  const isRequired = REQUIRED_FIELDS.includes(field)
                  const isDateField = DATE_FIELDS.includes(field)
                  const fieldId = `field-${field}`
                  return (
                    <div key={field}>
                      <label htmlFor={fieldId} className={`block text-sm font-medium mb-1 ${highContrast ? 'text-black' : 'text-gray-900'}`}>
                        {FIELD_LABELS[field]}
                        {!isRequired && <span className={`font-normal ml-1 ${highContrast ? 'text-gray-700' : 'text-gray-600'}`}>(optional)</span>}
                        {isRequired && <span className={`ml-1 font-bold ${highContrast ? 'text-red-900' : 'text-red-600'}`} aria-label="required">*</span>}
                      </label>
                      <div className="flex gap-2">
                        <input
                          id={fieldId}
                          ref={el => inputRefs.current[field] = el}
                          type={isDateField ? "date" : "text"}
                          value={formData[field]}
                          onChange={(e) => handleInputChange(field, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, field)}
                          className={`flex-1 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                            errors[field] 
                              ? highContrast 
                                ? 'border-2 border-red-900 bg-white text-black'
                                : 'border-2 border-red-600 bg-white text-gray-900'
                              : highContrast
                                ? 'border-2 border-black bg-white text-black'
                                : 'border-2 border-gray-800 bg-white text-gray-900'
                          }`}
                          autoFocus={index === 0 && !editingEntry}
                          aria-required={isRequired}
                          aria-invalid={!!errors[field]}
                          aria-describedby={errors[field] ? `${fieldId}-error` : undefined}
                        />
                        <button
                          type="button"
                          onClick={() => startVoiceInput(field)}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                            isListening && activeVoiceField === field
                              ? highContrast
                                ? 'bg-red-900 text-white border-red-900'
                                : 'bg-red-700 text-white border-red-700 hover:bg-red-800'
                              : highContrast
                                ? 'bg-gray-200 text-black border-black hover:bg-gray-300'
                                : 'bg-gray-200 text-gray-900 border-gray-800 hover:bg-gray-300'
                          }`}
                          aria-label={`Voice input for ${FIELD_LABELS[field]}`}
                          title={isListening && activeVoiceField === field ? 'Stop listening' : 'Start voice input'}
                        >
                          {isListening && activeVoiceField === field ? '🛑 Stop' : '🎤 Voice'}
                        </button>
                      </div>
                      {errors[field] && (
                        <p id={`${fieldId}-error`} className={`mt-1 text-sm font-semibold ${highContrast ? 'text-red-900' : 'text-red-700'}`} role="alert">{errors[field]}</p>
                      )}
                    </div>
                  )
                })}
              </div>

              {submitStatus && (
                <div className={`mt-4 p-3 rounded-md text-sm border-2 font-semibold ${
                  submitStatus.type === 'success' 
                    ? highContrast
                      ? 'bg-green-100 text-green-900 border-green-900'
                      : 'bg-green-50 text-green-800 border-green-300'
                    : highContrast
                      ? 'bg-red-100 text-red-900 border-red-900'
                      : 'bg-red-50 text-red-800 border-red-300'
                }`} role="alert">
                  {submitStatus.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`mt-6 w-full py-2 px-4 rounded-md border-2 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  highContrast
                    ? 'bg-black text-white border-black hover:bg-gray-800'
                    : 'bg-blue-700 text-white border-blue-700 hover:bg-blue-800'
                }`}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : editingEntry ? 'Update Entry' : 'Submit'}
              </button>
            </form>

            {/* Download Button */}
            <div className={`${highContrast ? 'bg-white border-2 border-black' : 'bg-white'} rounded-lg shadow-sm p-6`}>
              <button
                onClick={() => handleDownload()}
                className={`w-full py-2 px-4 rounded-md border-2 font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 transition-colors ${
                  highContrast
                    ? 'bg-green-900 text-white border-green-900 hover:bg-green-800'
                    : 'bg-green-700 text-white border-green-700 hover:bg-green-800'
                }`}
                aria-label="Download all datasets as Excel file"
              >
                Download All Datasets as Excel File
              </button>
              <p className={`mt-2 text-sm text-center ${highContrast ? 'text-black' : 'text-gray-700'}`}>
                Export all datasets as a single Excel file with multiple worksheets
              </p>
            </div>
          </div>
        )}

        {/* Manage View */}
        {viewMode === 'manage' && (
          <div role="tabpanel" id="manage-panel" aria-labelledby="manage-tab">
            {!selectedDataset ? (
              <div className={`${highContrast ? 'bg-white border-2 border-black' : 'bg-white'} rounded-lg shadow-sm p-6 text-center`}>
                <p className={highContrast ? 'text-black' : 'text-gray-700'}>Please select a dataset to view and manage entries.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className={`${highContrast ? 'bg-white border-2 border-black' : 'bg-white'} rounded-lg shadow-sm p-6`}>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className={`text-xl font-semibold ${highContrast ? 'text-black' : 'text-gray-900'}`}>
                      Dataset: <span className={highContrast ? 'text-blue-900' : 'text-blue-700'}>{selectedDataset}</span>
                    </h2>
                    <button
                      onClick={() => handleDownload(selectedDataset)}
                      className={`px-4 py-2 rounded-md border-2 font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 transition-colors ${
                        highContrast
                          ? 'bg-green-900 text-white border-green-900 hover:bg-green-800'
                          : 'bg-green-700 text-white border-green-700 hover:bg-green-800'
                      }`}
                      aria-label={`Download ${selectedDataset} dataset`}
                    >
                      Download This Dataset
                    </button>
                  </div>
                  <p className={`text-sm mb-4 ${highContrast ? 'text-black' : 'text-gray-700'}`}>
                    Total entries: <strong>{currentDatasetEntries.length}</strong>
                  </p>
                </div>

                {currentDatasetEntries.length === 0 ? (
                  <div className={`${highContrast ? 'bg-white border-2 border-black' : 'bg-white'} rounded-lg shadow-sm p-6 text-center`}>
                    <p className={highContrast ? 'text-black' : 'text-gray-700'}>No entries found in this dataset.</p>
                  </div>
                ) : (
                  <div className={`${highContrast ? 'bg-white border-2 border-black' : 'bg-white'} rounded-lg shadow-sm overflow-hidden`}>
                    <div className="overflow-x-auto">
                      <table className={`min-w-full ${highContrast ? 'divide-y divide-black' : 'divide-y divide-gray-300'}`} aria-label={`Entries for ${selectedDataset} dataset`}>
                        <thead className={highContrast ? 'bg-gray-200' : 'bg-gray-100'}>
                          <tr>
                            <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider border-b-2 ${highContrast ? 'text-black border-black' : 'text-gray-900 border-gray-800'}`}>ID</th>
                            {FIELD_ORDER.map(field => (
                              <th key={field} className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider border-b-2 ${highContrast ? 'text-black border-black' : 'text-gray-900 border-gray-800'}`}>
                                {FIELD_LABELS[field]}
                              </th>
                            ))}
                            <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider border-b-2 ${highContrast ? 'text-black border-black' : 'text-gray-900 border-gray-800'}`}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className={highContrast ? 'divide-y divide-black' : 'bg-white divide-y divide-gray-300'}>
                          {currentDatasetEntries.map((entry) => (
                            <tr key={entry.id} className={highContrast ? 'hover:bg-gray-100 border-b border-black' : 'hover:bg-gray-50'}>
                              <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${highContrast ? 'text-black' : 'text-gray-900'}`}>{entry.id}</td>
                              {FIELD_ORDER.map(field => (
                                <td key={field} className={`px-4 py-3 text-sm max-w-xs truncate ${highContrast ? 'text-black' : 'text-gray-900'}`} title={entry[field] || ''}>
                                  {entry[field] || '-'}
                                </td>
                              ))}
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEdit(entry)}
                                    className={`font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded px-2 py-1 border ${
                                      highContrast
                                        ? 'text-blue-900 border-blue-900 hover:bg-blue-100'
                                        : 'text-blue-700 border-blue-700 hover:bg-blue-50'
                                    }`}
                                    aria-label={`Edit entry ${entry.id}`}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(entry.id)}
                                    className={`font-semibold focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 rounded px-2 py-1 border ${
                                      highContrast
                                        ? 'text-red-900 border-red-900 hover:bg-red-100'
                                        : 'text-red-700 border-red-700 hover:bg-red-50'
                                    }`}
                                    aria-label={`Delete entry ${entry.id}`}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
