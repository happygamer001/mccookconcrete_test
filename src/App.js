import React, { useState, useEffect, useCallback } from 'react';
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
  '3743',
  'Semi'
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

const BATCH_MANAGERS = [
  'Batch Manager',
  'Supervisor'
];

const STATES = ['Nebraska', 'Kansas'];

function App() {
  // Authentication state
  const [currentDriver, setCurrentDriver] = useState('');
  const [customDriverName, setCustomDriverName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBatchManager, setIsBatchManager] = useState(false);
  
  // Selection state
  const [selectedTruck, setSelectedTruck] = useState('');
  const [trackingMode, setTrackingMode] = useState(null); // 'mileage', 'fuel', or 'daily-report'
  
  // Animation state
  const [animationClass, setAnimationClass] = useState('');
  
  // Mileage form state
  const [mileageData, setMileageData] = useState({
    date: new Date().toISOString().split('T')[0],
    state: 'Nebraska',
    mileageStart: '',
    mileageEnd: ''
  });
  
  // Incomplete entry state
  const [incompleteEntry, setIncompleteEntry] = useState(null);
  const [checkingIncomplete, setCheckingIncomplete] = useState(false);
  
  // Fuel form state
  const [fuelData, setFuelData] = useState({
    date: new Date().toISOString().split('T')[0],
    state: 'Nebraska',
    gallons: '',
    cost: '',
    location: '',
    fuelPhoto: null
  });
  
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

  // Check for incomplete mileage entry - wrapped in useCallback
  const checkForIncompleteEntry = useCallback(async () => {
    setCheckingIncomplete(true);
    const driverName = currentDriver === 'Other' ? customDriverName : currentDriver;
    
    try {
      const response = await fetch(
        `https://mileage-tracker-final.vercel.app/api/get-incomplete-mileage?driver=${encodeURIComponent(driverName)}&truck=${encodeURIComponent(selectedTruck)}`
      );
      
      const data = await response.json();
      
      if (data.found) {
        setIncompleteEntry(data.entry);
        // Pre-fill the form with the incomplete entry data
        setMileageData({
          date: data.entry.date,
          state: data.entry.state,
          mileageStart: data.entry.mileageStart.toString(),
          mileageEnd: ''
        });
      } else {
        setIncompleteEntry(null);
      }
    } catch (error) {
      console.error('Error checking for incomplete entry:', error);
    } finally {
      setCheckingIncomplete(false);
    }
  }, [currentDriver, customDriverName, selectedTruck]);

  // Check for incomplete entries when entering mileage mode
  useEffect(() => {
    if (trackingMode === 'mileage' && selectedTruck) {
      checkForIncompleteEntry();
    }
  }, [trackingMode, selectedTruck, checkForIncompleteEntry]);

  // Handle login
  const handleLogin = () => {
    const isBatchMgr = BATCH_MANAGERS.includes(currentDriver);
    
    if (currentDriver && (currentDriver !== 'Other' || customDriverName.trim())) {
      setIsLoggedIn(true);
      setIsBatchManager(isBatchMgr);
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
    setIncompleteEntry(null);
  };

  // Handle truck selection
  const handleTruckSelect = (truck) => {
    setAnimationClass('slide-in-right');
    setSelectedTruck(truck);
  };

  // Handle mode selection
  const handleModeSelect = (mode) => {
    setAnimationClass('slide-in-right');
    setTrackingMode(mode);
    setSubmitStatus(null);
  };

  // Handle back button
  const handleBack = () => {
    setAnimationClass('slide-in-left');
    if (trackingMode) {
      setTrackingMode(null);
      setIncompleteEntry(null);
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
    
    const driverName = currentDriver === 'Other' ? customDriverName : currentDriver;
    
    // If completing an existing entry
    if (incompleteEntry) {
      const totalMiles = parseFloat(mileageData.mileageEnd) - parseFloat(mileageData.mileageStart);
      
      if (totalMiles < 0) {
        alert('Ending mileage must be greater than starting mileage');
        return;
      }

      try {
        // Update the existing Notion entry
        const response = await fetch('https://mileage-tracker-final.vercel.app/api/mileage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'complete',
            entryId: incompleteEntry.id,
            mileageEnd: parseFloat(mileageData.mileageEnd),
            totalMiles: totalMiles
          }),
        });

        if (response.ok) {
          setSubmitStatus({ type: 'success', message: '✅ Shift completed! Mileage data submitted successfully!' });
          setIncompleteEntry(null);
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
        console.error('Error completing mileage:', error);
        setSubmitStatus({ type: 'error', message: 'Failed to submit data. Please try again.' });
      }
    } else {
      // Starting a new entry
      const payload = {
        action: 'start',
        driver: driverName,
        truck: selectedTruck,
        date: mileageData.date,
        state: mileageData.state,
        mileageStart: parseFloat(mileageData.mileageStart),
        timestamp: new Date().toISOString()
      };

      try {
        const response = await fetch('https://mileage-tracker-final.vercel.app/api/mileage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          setSubmitStatus({ type: 'success', message: '✅ Shift started! Come back later to enter your ending mileage.' });
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
        console.error('Error starting mileage:', error);
        setSubmitStatus({ type: 'error', message: 'Failed to submit data. Please try again.' });
      }
    }
  };

  // Submit fuel data to Notion
  const submitFuelData = async (e) => {
    e.preventDefault();

    const driverName = currentDriver === 'Other' ? customDriverName : currentDriver;
    const isSemi = selectedTruck === 'Semi';
    
    const payload = {
      driver: driverName,
      truck: selectedTruck,
      date: fuelData.date,
      state: fuelData.state,
      gallons: parseFloat(fuelData.gallons),
      cost: isSemi ? parseFloat(fuelData.cost) : null,
      location: isSemi ? (fuelData.location || 'N/A') : null,
      fuelPhoto: isSemi ? fuelData.fuelPhoto : null,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch('https://mileage-tracker-final.vercel.app/api/fuel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Reset fuel form
        setFuelData({
          date: new Date().toISOString().split('T')[0],
          state: 'Nebraska',
          gallons: '',
          cost: '',
          location: '',
          fuelPhoto: null
        });
        
        // Seamlessly redirect to mileage form with animation
        setAnimationClass('slide-in-right');
        setTrackingMode('mileage');
      } else {
        throw new Error('Failed to submit data');
      }
    } catch (error) {
      console.error('Error submitting fuel:', error);
      setSubmitStatus({ type: 'error', message: 'Failed to submit data. Please try again.' });
    }
  };

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

  const handleFuelPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFuelData({...fuelData, fuelPhoto: reader.result});
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
            <img src="/mccook-logo.png" alt="McCook Concrete Inc." className="company-logo" />
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
        <div className={`container ${animationClass}`}>
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
        <div className={`container ${animationClass}`}>
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

            {isBatchManager && (
              <button 
                onClick={() => handleModeSelect('daily-report')} 
                className="mode-card"
              >
                <div className="mode-icon">📋</div>
                <h2>Daily Report</h2>
                <p>Submit batch manager daily report</p>
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
        <div className={`container ${animationClass}`}>
          <div className="header">
            <button onClick={handleBack} className="btn btn-back">
              ← Back
            </button>
            <h1>{incompleteEntry ? 'Complete Shift' : 'Start Shift'}</h1>
            <p className="user-info">Driver: {displayName} | Truck: {selectedTruck}</p>
          </div>

          {checkingIncomplete && (
            <div className="info-message">
              Checking for incomplete entries...
            </div>
          )}

          {incompleteEntry && (
            <div className="incomplete-entry-notice">
              📍 <strong>Active Shift Found</strong>
              <p>Started: {new Date(incompleteEntry.createdTime).toLocaleString()}</p>
              <p>Starting Mileage: {incompleteEntry.mileageStart}</p>
              <p>State: {incompleteEntry.state}</p>
            </div>
          )}

          <form onSubmit={submitMileageData} className="tracking-form">
            <div className="form-group">
              <label htmlFor="mileage-date">Date:</label>
              <input
                id="mileage-date"
                type="date"
                value={mileageData.date}
                onChange={(e) => setMileageData({...mileageData, date: e.target.value})}
                required
                disabled={!!incompleteEntry}
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
                disabled={!!incompleteEntry}
                className="select-input"
              >
                {STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            {!incompleteEntry && (
              <div className="form-group">
                <label htmlFor="mileage-start">Starting Mileage:</label>
                <input
                  id="mileage-start"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={mileageData.mileageStart}
                  onChange={(e) => setMileageData({...mileageData, mileageStart: e.target.value})}
                  placeholder="Enter starting odometer reading"
                  required
                  className="text-input"
                />
              </div>
            )}

            {incompleteEntry && (
              <div className="form-group">
                <label htmlFor="mileage-end">Ending Mileage:</label>
                <input
                  id="mileage-end"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={mileageData.mileageEnd}
                  onChange={(e) => setMileageData({...mileageData, mileageEnd: e.target.value})}
                  placeholder="Enter ending odometer reading"
                  required
                  className="text-input"
                />
              </div>
            )}

            {totalMiles > 0 && (
              <div className="calculation-display">
                <strong>Total Miles:</strong> {totalMiles.toFixed(1)} miles
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-submit">
              {incompleteEntry ? 'Complete Shift' : 'Start Shift'}
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
    const isSemi = selectedTruck === 'Semi';
    const costPerGallon = isSemi && fuelData.gallons && fuelData.cost
      ? (parseFloat(fuelData.cost) / parseFloat(fuelData.gallons)).toFixed(2)
      : 0;

    return (
      <div className="App">
        <div className={`container ${animationClass}`}>
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
              <label htmlFor="fuel-gallons">{isSemi ? 'Gallons Purchased:' : 'Gallons Filled:'}</label>
              <input
                id="fuel-gallons"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={fuelData.gallons}
                onChange={(e) => setFuelData({...fuelData, gallons: e.target.value})}
                placeholder="Enter gallons"
                required
                className="text-input"
              />
            </div>

            {isSemi && (
              <>
                <div className="form-group">
                  <label htmlFor="fuel-cost">Total Cost ($):</label>
                  <input
                    id="fuel-cost"
                    type="number"
                    inputMode="decimal"
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

                <div className="form-group">
                  <label htmlFor="fuel-photo">Receipt Photo (Optional):</label>
                  <input
                    id="fuel-photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFuelPhotoUpload}
                    className="file-input"
                  />
                  {fuelData.fuelPhoto && (
                    <p className="file-preview">✅ Photo attached</p>
                  )}
                </div>

                {costPerGallon > 0 && (
                  <div className="calculation-display">
                    <strong>Price per Gallon:</strong> ${costPerGallon}
                  </div>
                )}
              </>
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

  // Daily Report form
  if (trackingMode === 'daily-report') {
    const predefinedDrivers = ['James', 'Matt', 'Calvin', 'Jerron', 'Nic'];
    const customDrivers = ['Custom1', 'Custom2'];
    
    return (
      <div className="App">
        <div className={`container ${animationClass}`}>
          <div className="header">
            <button onClick={handleBack} className="btn-back">← Back</button>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </div>

          <h2>📋 MCI Daily Tab Sheet</h2>
          <p className="subtitle">Prepared by: {currentDriver}</p>

          <form onSubmit={submitDailyReport} className="tracking-form daily-report-form">
            <div className="form-group">
              <label htmlFor="report-date">Date:</label>
              <input
                id="report-date"
                type="date"
                value={dailyReportData.date}
                onChange={(e) => setDailyReportData({...dailyReportData, date: e.target.value})}
                required
                className="date-input"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="yards-out">Yards Out:</label>
                <input
                  id="yards-out"
                  type="number"
                  step="0.01"
                  value={dailyReportData.yardsOut}
                  onChange={(e) => setDailyReportData({...dailyReportData, yardsOut: e.target.value})}
                  placeholder="e.g., 4"
                  required
                  className="number-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="trips-out">Trips Out:</label>
                <input
                  id="trips-out"
                  type="number"
                  value={dailyReportData.tripsOut}
                  onChange={(e) => setDailyReportData({...dailyReportData, tripsOut: e.target.value})}
                  placeholder="e.g., 1"
                  required
                  className="number-input"
                />
              </div>
            </div>

            <div className="drivers-section">
              <h3>Drivers:</h3>
              
              {predefinedDrivers.map(driver => (
                <div key={driver} className="driver-row">
                  <span className="driver-name">{driver}</span>
                  <div className="driver-checkboxes">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={driverStatus[driver].halfDay}
                        onChange={() => handleDriverCheckbox(driver, 'halfDay')}
                      />
                      <span>Half Day</span>
                    </label>
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={driverStatus[driver].fullDay}
                        onChange={() => handleDriverCheckbox(driver, 'fullDay')}
                      />
                      <span>Full Day</span>
                    </label>
                  </div>
                </div>
              ))}

              {customDrivers.map(key => (
                <div key={key} className="driver-row custom-driver">
                  <input
                    type="text"
                    value={driverStatus[key].name}
                    onChange={(e) => handleCustomDriverName(key, e.target.value)}
                    placeholder="Other driver name..."
                    className="custom-driver-input"
                  />
                  <div className="driver-checkboxes">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={driverStatus[key].halfDay}
                        onChange={() => handleDriverCheckbox(key, 'halfDay')}
                        disabled={!driverStatus[key].name}
                      />
                      <span>Half Day</span>
                    </label>
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={driverStatus[key].fullDay}
                        onChange={() => handleDriverCheckbox(key, 'fullDay')}
                        disabled={!driverStatus[key].name}
                      />
                      <span>Full Day</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-group">
              <label htmlFor="fuel-reading">End of Day Fuel Tank Reading:</label>
              <input
                id="fuel-reading"
                type="number"
                step="0.1"
                value={dailyReportData.fuelReading}
                onChange={(e) => setDailyReportData({...dailyReportData, fuelReading: e.target.value})}
                placeholder="e.g., 14642"
                required
                className="number-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="issues">Issues (Optional):</label>
              <textarea
                id="issues"
                value={dailyReportData.issues}
                onChange={(e) => setDailyReportData({...dailyReportData, issues: e.target.value})}
                placeholder="Enter any issues or leave blank for N/A"
                rows="4"
                className="textarea-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="issue-photo">Issue Photo (Optional):</label>
              <input
                id="issue-photo"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="file-input"
              />
              {dailyReportData.issuePhoto && (
                <p className="file-preview">✅ Photo attached</p>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-submit">
              Submit Daily Report
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
