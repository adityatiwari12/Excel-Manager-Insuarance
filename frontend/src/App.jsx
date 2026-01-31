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
  const [formData, setFormData] = useState(() => {
    const savedDraft = localStorage.getItem('formDraft')
    if (savedDraft) {
      try {
        return JSON.parse(savedDraft)
      } catch (e) {
        console.error('Error parsing draft:', e)
      }
    }
    return {
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
    }
  })

  const [datasets, setDatasets] = useState([])
  const [selectedDataset, setSelectedDataset] = useState(() => localStorage.getItem('lastSelectedDataset') || '')
  const [newDatasetName, setNewDatasetName] = useState(() => localStorage.getItem('lastNewDatasetName') || '')
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
  const [language, setLanguage] = useState('en')

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

  // Auto-save form draft
  useEffect(() => {
    // Only save if dirty (has at least one field filled) or if we want to persist empty state too (simpler)
    // We avoid saving if we are in 'manage' mode (editing existing entry) to prevent overwriting new entry draft?
    // Actually, user might want to persist edit in progress too? 
    // For now scope to "Data Entry" mode for drafts to keep logical separation.
    if (viewMode === 'form' && !editingEntry) {
      localStorage.setItem('formDraft', JSON.stringify(formData))
    }
  }, [formData, viewMode, editingEntry])

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
    localStorage.setItem('lastSelectedDataset', selectedDataset)
  }, [selectedDataset])

  useEffect(() => {
    localStorage.setItem('lastNewDatasetName', newDatasetName)
  }, [newDatasetName])

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
        localStorage.removeItem('formDraft')
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
    <div className={`min-h-screen ${highContrast ? 'bg-white' : 'bg-gray-50'} py-8 px-4 flex flex-col`}>
      <div className="max-w-6xl mx-auto w-full flex-grow">

        {/* Header with Title and Logo */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-sm border-2 border-transparent gap-4">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Excel Data Manager Logo" className="h-12 w-auto" />
            <div>
              <h1 className={`text-3xl font-bold ${highContrast ? 'text-black' : 'text-blue-900'}`}>
                Excel Data Manager
              </h1>
              <p className={`text-xs font-semibold uppercase tracking-wider ${highContrast ? 'text-black' : 'text-blue-700'}`}>
                Official Claim Intimation Register
              </p>
            </div>
          </div>
          <div className={`text-right hidden md:block ${highContrast ? 'text-black' : 'text-gray-500'}`}>
            <p className="text-sm italic font-medium">Built for Insurance Operations Efficiency</p>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className={`${highContrast ? 'bg-white border-2 border-black' : 'bg-white'} rounded-lg shadow-sm p-2 mb-6`} role="tablist" aria-label="Application modes">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setViewMode('form')
                setEditingEntry(null)
                handleCancelEdit()
              }}
              role="tab"
              aria-selected={viewMode === 'form'}
              aria-controls="form-panel"
              className={`flex-1 min-w-[120px] px-4 py-2 rounded-md text-sm font-medium transition-colors border-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${viewMode === 'form'
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
              className={`flex-1 min-w-[120px] px-4 py-2 rounded-md text-sm font-medium transition-colors border-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${viewMode === 'manage'
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
            <button
              onClick={() => setViewMode('guide')}
              role="tab"
              aria-selected={viewMode === 'guide'}
              className={`flex-1 min-w-[120px] px-4 py-2 rounded-md text-sm font-medium transition-colors border-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${viewMode === 'guide'
                ? highContrast
                  ? 'bg-black text-white border-black'
                  : 'bg-blue-700 text-white border-blue-700'
                : highContrast
                  ? 'bg-white text-black border-black hover:bg-gray-100'
                  : 'bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200'
                }`}
            >
              How to Use
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
              className={`flex-1 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${highContrast
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
                className={`w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${highContrast
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
                <div className={`mb-4 p-3 rounded-md border-2 ${highContrast
                  ? 'bg-gray-100 border-black'
                  : 'bg-blue-50 border-blue-300'
                  }`}>
                  <p className={`text-sm font-semibold ${highContrast ? 'text-black' : 'text-blue-900'}`}>
                    <strong>Editing Entry ID:</strong> {editingEntry.id}
                  </p>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className={`mt-2 text-sm font-semibold underline focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${highContrast
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
                          className={`flex-1 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${errors[field]
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
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${isListening && activeVoiceField === field
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
                <div className={`mt-4 p-3 rounded-md text-sm border-2 font-semibold ${submitStatus.type === 'success'
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
                className={`mt-6 w-full py-2 px-4 rounded-md border-2 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${highContrast
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
                className={`w-full py-2 px-4 rounded-md border-2 font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 transition-colors ${highContrast
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

        {/* How to Use View (Multilingual) */}
        {viewMode === 'guide' && (
          <div className="space-y-6">
            <div className={`${highContrast ? 'bg-white border-2 border-black' : 'bg-white'} rounded-lg shadow-sm p-6`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-2xl font-bold ${highContrast ? 'text-black' : 'text-blue-900'}`}>
                  {language === 'en' ? 'User Guide' : 'उपयोगकर्ता मार्गदर्शिका'}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 text-xs font-bold rounded border-2 transition-colors ${language === 'en'
                      ? highContrast ? 'bg-black text-white border-black' : 'bg-blue-700 text-white border-blue-700'
                      : highContrast ? 'bg-white text-black border-black hover:bg-gray-100' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setLanguage('hi')}
                    className={`px-3 py-1 text-xs font-bold rounded border-2 transition-colors ${language === 'hi'
                      ? highContrast ? 'bg-black text-white border-black' : 'bg-blue-700 text-white border-blue-700'
                      : highContrast ? 'bg-white text-black border-black hover:bg-gray-100' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
                  >
                    हिन्दी
                  </button>
                </div>
              </div>

              <div className={`space-y-8 ${highContrast ? 'text-black' : 'text-gray-800'}`}>
                <section>
                  <h3 className="text-lg font-bold mb-3 border-b-2 border-blue-100 pb-1">
                    {language === 'en' ? '1. Accurate Data Entry' : '1. सटीक डेटा प्रविष्टि'}
                  </h3>
                  <p className="text-sm leading-relaxed">
                    {language === 'en'
                      ? 'This tool is optimized for high-speed claim intimation registration. Each field corresponds to a critical data point for insurance processing. Use "Tab" to move to the next field quickly.'
                      : 'यह टूल हाई-स्पीड क्लेम इंटिमेशन रेजिस्ट्रेशन के लिए अनुकूलित है। प्रत्येक फ़ील्ड बीमा प्रसंस्करण के लिए एक महत्वपूर्ण डेटा पॉइंट से मेल खाती है। तेज़ी से अगले फ़ील्ड पर जाने के लिए "Tab" का उपयोग करें।'}
                  </p>
                  <ul className="list-disc ml-5 mt-2 text-sm space-y-1">
                    <li>{language === 'en' ? 'Red asterisks (*) indicate mandatory fields like Policy and Claim numbers.' : 'लाल तारांकन (*) पॉलिसी और क्लेम नंबर जैसे अनिवार्य फ़ील्ड को दर्शाते हैं।'}</li>
                    <li>{language === 'en' ? 'Voice input is available (🎤) for hands-free data capture during phone calls.' : 'फोन कॉल के दौरान हैंड्स-फ्री डेटा कैप्चर के लिए वॉइस इनपुट (🎤) उपलब्ध है।'}</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 border-b-2 border-blue-100 pb-1">
                    {language === 'en' ? '2. Managing Datasets' : '2. डेटासेट प्रबंधित करना'}
                  </h3>
                  <p className="text-sm leading-relaxed">
                    {language === 'en'
                      ? 'Datasets act as virtual folders. You can organize intakes by branch, date, or insurance type.'
                      : 'डेटासेट वर्चुअल फोल्डर्स के रूप में कार्य करते हैं। आप शाखा, तिथि या बीमा प्रकार के अनुसार इंटेक्स को व्यवस्थित कर सकते हैं।'}
                  </p>
                  <ul className="list-disc ml-5 mt-2 text-sm space-y-1">
                    <li>{language === 'en' ? 'Create a "New Dataset" for each batch of registrations.' : 'पंजीकरण के प्रत्येक बैच के लिए एक "नया डेटासेट" बनाएं।'}</li>
                    <li>{language === 'en' ? 'Switch to "Manage Datasets" to edit or delete existing entries.' : 'मौजूदा प्रविष्टियों को संपादित करने या हटाने के लिए "मैनेज डेटासेट" पर स्विच करें।'}</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 border-b-2 border-blue-100 pb-1">
                    {language === 'en' ? '3. Reporting and Export' : '3. रिपोर्टिंग और एक्सपोर्ट'}
                  </h3>
                  <p className="text-sm leading-relaxed">
                    {language === 'en'
                      ? 'Download your data anytime as professionally formatted Excel files (.xlsx). The system automatically sizes columns for readability.'
                      : 'किसी भी समय पेशेवर रूप से स्वरूपित एक्सेल फाइलों (.xlsx) के रूप में अपना डेटा डाउनलोड करें। सिस्टम पठनीयता के लिए स्वचालित रूप से कॉलम का आकार निर्धारित करता है।'}
                  </p>
                </section>

                <div className={`p-4 rounded-md border-2 ${highContrast ? 'bg-gray-100 border-black' : 'bg-blue-50 border-blue-100'}`}>
                  <p className="text-xs italic font-bold">
                    {language === 'en'
                      ? 'Note: All data is auto-saved locally. Even if you refresh the page, your progress in the Claim Register is preserved.'
                      : 'नोट: सभी डेटा स्थानीय रूप से ऑटो-सेव होता है। यदि आप पेज को रिफ्रेश भी करते हैं, तो क्लेम रजिस्टर में आपकी प्रगति सुरक्षित रहती है।'}
                  </p>
                </div>
              </div>
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
                      className={`px-4 py-2 rounded-md border-2 font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 transition-colors ${highContrast
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
                                    className={`font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded px-2 py-1 border ${highContrast
                                      ? 'text-blue-900 border-blue-900 hover:bg-blue-100'
                                      : 'text-blue-700 border-blue-700 hover:bg-blue-50'
                                      }`}
                                    aria-label={`Edit entry ${entry.id}`}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(entry.id)}
                                    className={`font-semibold focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 rounded px-2 py-1 border ${highContrast
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

      {/* Footer */}
      <footer className={`max-w-6xl mx-auto w-full mt-12 pt-8 border-t-2 ${highContrast ? 'border-black text-black' : 'border-gray-200 text-gray-600'}`}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4">
          <p className="text-sm font-medium">
            © {new Date().getFullYear()} Excel Data Manager. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-sm">Built by <span className="font-bold underline">Aditya Tiwari</span></span>
            <a
              href="https://github.com/adityatiwari12"
              target="_blank"
              rel="noopener noreferrer"
              className={`p-2 rounded-full transition-all hover:scale-110 ${highContrast ? 'bg-black text-white' : 'bg-gray-900 text-white'}`}
              aria-label="View Aditya Tiwari's GitHub Profile"
            >
              <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
