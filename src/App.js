import React, { useState } from 'react';
import './App.css';

// Truck and Driver data
const TRUCKS = [
  'Green Truck (GT01)',
  'Red Truck (RT01)',
  'Dump Truck (DT01)',
  '2500',
  '2502',
  '2503',
  '2504',
  '2507',
  '2204',
  '3743'
];

const DRIVERS = [
  'Basil',
  'Calvin',
  'Matt',
  'James',
  'Nic',
  'Jerron',
  'Other'
];
// ADD THIS NEW CONSTANT ⬇️
const BATCH_MANAGERS = [
  'Batch Manager',
  'Supervisor'
const STATES = ['Nebraska', 'Kansas'];

function App() {
  // Authentication state
  const [currentDriver, setCurrentDriver] = useState('');
  const [customDriverName, setCustomDriverName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBatchManager, setIsBatchManager] = useState(false);  // ⬅️ ADD THIS LINE
  // Selection state
  const [selectedTruck, setSelectedTruck] = useState('');
  const [trackingMode, setTrackingMode] = useState(null); // 'mileage', 'fuel', or 'daily-report'
  
  // Mileage form state
  const [mileageData, setMileageData] = useState({
    date: new Date().toISOString().split('T')[0],
    state: 'Nebraska',
    mileageStart: '',
    mileageEnd: ''
  });
  
  // Fuel form state
  const [fuelData, setFuelData] = useState({
    date: new Date().toISOString().split('T')[0],
    state: 'Nebraska',
    gallons: '',
    cost: '',
    location: ''
  });
  
  // ADD THESE TWO STATE BLOCKS ⬇️
  // Daily Report form state
  const [dailyReportData, setDailyReportData] = useState({
    date: new Date().toISOString().split('T')[0],
    yardsOut: '',
    tripsOut: '',
    fuelReading: '',
    issues: '',
    issuePhoto: null
  });

  // Driver work status - initialized with known drivers + 2 blanks
  const [driverStatus, setDriverStatus] = useState({
    'James': { halfDay: false, fullDay: false },
    'Matt': { halfDay: false, fullDay: false },
    'Calvin': { halfDay: false, fullDay: false },
    'Jerron': { halfDay: false, fullDay: false },
    'Nic': { halfDay: false, fullDay: false },
    'Custom1': { name: '', halfDay: false, fullDay: false },
    'Custom2': { name: '', halfDay: false, fullDay: false }
  });
  
  
  // Feedback state
  const [submitStatus, setSubmitStatus] = useState(null);

  // Handle login
  const handleLogin = () => {
    const isBatchMgr = BATCH_MANAGERS.includes(currentDriver);  // ⬅️ ADD THIS LINE
    
    if (currentDriver && (currentDriver !== 'Other' || customDriverName.trim())) {
      setIsLoggedIn(true);
      setIsBatchManager(isBatchMgr);  // ⬅️ ADD THIS LINE
    } else {
      alert('Please select a driver name');
    }
  };

  // Handle logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentDriver('');
    setCustomDriverName('');
    setSelectedTruck('');
    setTrackingMode(null);
  };

  // Handle truck selection
  const handleTruckSelect = (truck) => {
    setSelectedTruck(truck);
  };

  // Handle mode selection
  const handleModeSelect = (mode) => {
    setTrackingMode(mode);
    setSubmitStatus(null);
  };

  // Handle back button
  const handleBack = () => {
    if (trackingMode) {
      setTrackingMode(null);
      // Reset forms
      setMileageData({
        date: new Date().toISOString().split('T')[0],
        state: 'Nebraska',
        mileageStart: '',
        mileageEnd: ''
      });
      setFuelData({
        date: new Date().toISOString().split('T')[0],
        state: 'Nebraska',
        gallons: '',
        cost: '',
        location: ''
      });
    } else if (selectedTruck) {
      setSelectedTruck('');
    }
  };

  // Submit mileage data to Notion
  const submitMileageData = async (e) => {
    e.preventDefault();
    
    const totalMiles = parseFloat(mileageData.mileageEnd) - parseFloat(mileageData.mileageStart);
    
    if (totalMiles < 0) {
      alert('Ending mileage must be greater than starting mileage');
      return;
    }

    const driverName = currentDriver === 'Other' ? customDriverName : currentDriver;
    
    const payload = {
      driver: driverName,
      truck: selectedTruck,
      date: mileageData.date,
      state: mileageData.state,
      mileageStart: parseFloat(mileageData.mileageStart),
      mileageEnd: parseFloat(mileageData.mileageEnd),
      totalMiles: totalMiles,
      timestamp: new Date().toISOString()
    };

    try {
      // Call your backend API endpoint to submit to Notion
      const response = await fetch('https://mileage-tracker-final.vercel.app/api/mileage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmitStatus({ type: 'success', message: 'Mileage data submitted successfully!' });
        // Reset form
        setMileageData({
          date: new Date().toISOString().split('T')[0],
          state: 'Nebraska',
          mileageStart: '',
          mileageEnd: ''
        });
      } else {
        throw new Error('Failed to submit data');
      }
    } catch (error) {
      console.error('Error submitting mileage:', error);
      setSubmitStatus({ type: 'error', message: 'Failed to submit data. Please try again.' });
    }
  };

 // Submit fuel data to Notion
  const submitFuelData = async (e) => {
    // ... existing fuel submit code ...
  };

  // ADD ALL THESE HELPER FUNCTIONS ⬇️
  // Helper functions for Daily Report
  const handleDriverCheckbox = (driver, type) => {
    setDriverStatus({
      ...driverStatus,
      [driver]: {
        halfDay: type === 'halfDay' ? !driverStatus[driver].halfDay : false,
        fullDay: type === 'fullDay' ? !driverStatus[driver].fullDay : false
      }
    });
  };

  const handleCustomDriverName = (key, name) => {
    setDriverStatus({
      ...driverStatus,
      [key]: {
        ...driverStatus[key],
        name: name
      }
    });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDailyReportData({...dailyReportData, issuePhoto: reader.result});
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit daily report to Notion
  const submitDailyReport = async (e) => {
    e.preventDefault();
    
    const submitterName = isBatchManager ? currentDriver : customDriverName;
    
    // Build drivers array from driver status
    const drivers = [];
    Object.keys(driverStatus).forEach(key => {
      const status = driverStatus[key];
      const driverName = key.startsWith('Custom') ? status.name : key;
      
      if (driverName && (status.halfDay || status.fullDay)) {
        drivers.push({
          name: driverName,
          halfDay: status.halfDay,
          fullDay: status.fullDay
        });
      }
    });
    
    const payload = {
      date: dailyReportData.date,
      yardsOut: parseFloat(dailyReportData.yardsOut),
      tripsOut: parseFloat(dailyReportData.tripsOut),
      drivers: drivers,
      fuelReading: parseFloat(dailyReportData.fuelReading),
      issues: dailyReportData.issues || 'N/A',
      issuePhoto: dailyReportData.issuePhoto,
      preparedBy: submitterName,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch('https://mileage-tracker-final.vercel.app/api/daily-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmitStatus({ type: 'success', message: '✅ Daily report submitted successfully!' });
        
        // Reset form
        setDailyReportData({
          date: new Date().toISOString().split('T')[0],
          yardsOut: '',
          tripsOut: '',
          fuelReading: '',
          issues: '',
          issuePhoto: null
        });
        
        // Reset driver statuses
        setDriverStatus({
          'James': { halfDay: false, fullDay: false },
          'Matt': { halfDay: false, fullDay: false },
          'Calvin': { halfDay: false, fullDay: false },
          'Jerron': { halfDay: false, fullDay: false },
          'Nic': { halfDay: false, fullDay: false },
          'Custom1': { name: '', halfDay: false, fullDay: false },
          'Custom2': { name: '', halfDay: false, fullDay: false }
        });
      } else {
        throw new Error('Failed to submit data');
      }
    } catch (error) {
      console.error('Error submitting daily report:', error);
      setSubmitStatus({ type: 'error', message: 'Failed to submit data. Please try again.' });
    }
  };

  // Render login screen
  if (!isLoggedIn) {
    return (
      <div className="App">
        <div className="container">
          <div className="login-screen">
            <h1>McCook Concrete Inc.</h1>
            <h2>Mileage & Fuel Tracker</h2>
            
            <div className="login-form">
              <label htmlFor="driver-select">Select Your Name:</label>
              <select
                id="driver-select"
                value={currentDriver}
                onChange={(e) => setCurrentDriver(e.target.value)}
                required
              >
                <option value="">-- Select Your Name --</option>
                
                {/* ADD THIS SECTION ⬇️ */}
                <optgroup label="Batch Managers">
                  {BATCH_MANAGERS.map(manager => (
                    <option key={manager} value={manager}>{manager}</option>
                  ))}
                </optgroup>
                
                <optgroup label="Drivers">
                  {DRIVERS.map(driver => (
                    <option key={driver} value={driver}>{driver}</option>
                  ))}
                </optgroup>
              </select>

              {currentDriver === 'Other' && (
                <div className="custom-driver-input">
                  <label htmlFor="custom-driver">Enter Your Name:</label>
                  <input
                    id="custom-driver"
                    type="text"
                    value={customDriverName}
                    onChange={(e) => setCustomDriverName(e.target.value)}
                    placeholder="Enter your name"
                    className="text-input"
                  />
                </div>
              )}

              <button onClick={handleLogin} className="btn btn-primary">
                Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render truck selection screen
  if (!selectedTruck) {
    const displayName = currentDriver === 'Other' ? customDriverName : currentDriver;
    return (
      <div className="App">
        <div className="container">
          <div className="header">
            <h1>Select Truck</h1>
            <p className="user-info">Driver: {displayName}</p>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>

          <div className="truck-grid">
            {TRUCKS.map(truck => (
              <button
                key={truck}
                onClick={() => handleTruckSelect(truck)}
                className="truck-card"
              >
                <div className="truck-icon">🚛</div>
                <div className="truck-name">{truck}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render tracking mode selection
  if (!trackingMode) {
    const displayName = currentDriver === 'Other' ? customDriverName : currentDriver;
    return (
      <div className="App">
        <div className="container">
          <div className="header">
            <button onClick={handleBack} className="btn btn-back">
              ← Back
            </button>
            <h1>Select Tracking Mode</h1>
            <p className="user-info">Driver: {displayName} | Truck: {selectedTruck}</p>
          </div>

          <div className="mode-selection">
            <button
              onClick={() => handleModeSelect('mileage')}
              className="mode-card"
            >
              <div className="mode-icon">📍</div>
              <h2>Track Mileage</h2>
              <p>Record trip mileage by state</p>
            </button>

            <button
              onClick={() => handleModeSelect('fuel')}
              className="mode-card"
            >
              <div className="mode-icon">⛽</div>
              <h2>Track Fuel</h2>
              <p>Record fuel purchases</p>
            </button>
                {/* ADD THIS BUTTON ⬇️ */}
          {isBatchManager && (
            <button 
              onClick={() => handleModeSelect('daily-report')} 
              className="btn btn-primary"
            >
              📋 Daily Report
            </button>
          )}
          </div>
        </div>
      </div>
    );
  }

  // Render mileage tracking form
  if (trackingMode === 'mileage') {
    const displayName = currentDriver === 'Other' ? customDriverName : currentDriver;
    const totalMiles = mileageData.mileageEnd && mileageData.mileageStart 
      ? parseFloat(mileageData.mileageEnd) - parseFloat(mileageData.mileageStart)
      : 0;

    return (
      <div className="App">
        <div className="container">
          <div className="header">
            <button onClick={handleBack} className="btn btn-back">
              ← Back
            </button>
            <h1>Track Mileage</h1>
            <p className="user-info">Driver: {displayName} | Truck: {selectedTruck}</p>
          </div>

          <form onSubmit={submitMileageData} className="tracking-form">
            <div className="form-group">
              <label htmlFor="mileage-date">Date:</label>
              <input
                id="mileage-date"
                type="date"
                value={mileageData.date}
                onChange={(e) => setMileageData({...mileageData, date: e.target.value})}
                required
                className="text-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="mileage-state">State:</label>
              <select
                id="mileage-state"
                value={mileageData.state}
                onChange={(e) => setMileageData({...mileageData, state: e.target.value})}
                required
                className="select-input"
              >
                {STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="mileage-start">Starting Mileage:</label>
              <input
                id="mileage-start"
                type="number"
                step="0.1"
                value={mileageData.mileageStart}
                onChange={(e) => setMileageData({...mileageData, mileageStart: e.target.value})}
                placeholder="Enter starting odometer reading"
                required
                className="text-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="mileage-end">Ending Mileage:</label>
              <input
                id="mileage-end"
                type="number"
                step="0.1"
                value={mileageData.mileageEnd}
                onChange={(e) => setMileageData({...mileageData, mileageEnd: e.target.value})}
                placeholder="Enter ending odometer reading"
                required
                className="text-input"
              />
            </div>

            {totalMiles > 0 && (
              <div className="calculation-display">
                <strong>Total Miles:</strong> {totalMiles.toFixed(1)} miles
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-submit">
              Submit Mileage
            </button>

            {submitStatus && (
              <div className={`status-message ${submitStatus.type}`}>
                {submitStatus.message}
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // Render fuel tracking form
  if (trackingMode === 'fuel') {
    const displayName = currentDriver === 'Other' ? customDriverName : currentDriver;
    const costPerGallon = fuelData.gallons && fuelData.cost
      ? (parseFloat(fuelData.cost) / parseFloat(fuelData.gallons)).toFixed(2)
      : 0;

    return (
      <div className="App">
        <div className="container">
          <div className="header">
            <button onClick={handleBack} className="btn btn-back">
              ← Back
            </button>
            <h1>Track Fuel</h1>
            <p className="user-info">Driver: {displayName} | Truck: {selectedTruck}</p>
          </div>

          <form onSubmit={submitFuelData} className="tracking-form">
            <div className="form-group">
              <label htmlFor="fuel-date">Date:</label>
              <input
                id="fuel-date"
                type="date"
                value={fuelData.date}
                onChange={(e) => setFuelData({...fuelData, date: e.target.value})}
                required
                className="text-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="fuel-state">State:</label>
              <select
                id="fuel-state"
                value={fuelData.state}
                onChange={(e) => setFuelData({...fuelData, state: e.target.value})}
                required
                className="select-input"
              >
                {STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="fuel-gallons">Gallons Purchased:</label>
              <input
                id="fuel-gallons"
                type="number"
                step="0.01"
                value={fuelData.gallons}
                onChange={(e) => setFuelData({...fuelData, gallons: e.target.value})}
                placeholder="Enter gallons"
                required
                className="text-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="fuel-cost">Total Cost ($):</label>
              <input
                id="fuel-cost"
                type="number"
                step="0.01"
                value={fuelData.cost}
                onChange={(e) => setFuelData({...fuelData, cost: e.target.value})}
                placeholder="Enter total cost"
                required
                className="text-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="fuel-location">Location (Optional):</label>
              <input
                id="fuel-location"
                type="text"
                value={fuelData.location}
                onChange={(e) => setFuelData({...fuelData, location: e.target.value})}
                placeholder="e.g., Shell - McCook"
                className="text-input"
              />
            </div>

            {costPerGallon > 0 && (
              <div className="calculation-display">
                <strong>Price per Gallon:</strong> ${costPerGallon}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-submit">
              Submit Fuel Data
            </button>

            {submitStatus && (
              <div className={`status-message ${submitStatus.type}`}>
                {submitStatus.message}
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
