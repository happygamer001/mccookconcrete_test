import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Truck and Driver data
const TRUCKS = [
  'Green Semi',
  'Dump Truck (2525)',
  '2500',
  '2502',
  '2503',
  '2504',
  '2507'
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
  
  // Cross state line state
  const [showCrossStateModal, setShowCrossStateModal] = useState(false);
  const [crossStateMileage, setCrossStateMileage] = useState('');
  const [newState, setNewState] = useState('Kansas');
  
  // GPS detection state
  const [gpsPermission, setGpsPermission] = useState(null); // null, 'granted', 'denied'
  const [detectedStateCrossing, setDetectedStateCrossing] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);
  
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
    name: '',
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
  
  // Completion screen state
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  
  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });
  
  // Online/offline state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Week at a glance data
  const [weekData, setWeekData] = useState(null);
  const [loadingWeekData, setLoadingWeekData] = useState(false);
  
  // Fleet status data
  const [fleetStatus, setFleetStatus] = useState(null);
  const [loadingFleetStatus, setLoadingFleetStatus] = useState(false);

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

  // Determine state from GPS coordinates
  const getStateFromCoordinates = (latitude, longitude) => {
    // Nebraska/Kansas border is approximately at 40°N latitude
    // Nebraska is north of the border, Kansas is south
    
    // Rough boundaries:
    // Nebraska: 40°N to 43°N, -104°W to -95.3°W
    // Kansas: 37°N to 40°N, -102°W to -94.6°W
    
    if (latitude >= 40.0) {
      return 'Nebraska';
    } else if (latitude < 40.0 && latitude >= 37.0) {
      return 'Kansas';
    }
    
    // Default to Nebraska if coordinates are unclear
    return 'Nebraska';
  };

  // Check GPS location and detect state crossing
  const checkGPSLocation = useCallback(() => {
    if (!incompleteEntry) return;
    
    // Don't check if modal is already open
    if (showCrossStateModal) return;
    
    // Check if GPS is available
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      return;
    }
    
    setCheckingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const detectedState = getStateFromCoordinates(latitude, longitude);
        
        console.log(`GPS Location: ${latitude}, ${longitude}`);
        console.log(`Detected State: ${detectedState}`);
        console.log(`Shift State: ${incompleteEntry.state}`);
        
        // If detected state is different from shift state, prompt user
        if (detectedState !== incompleteEntry.state) {
          setDetectedStateCrossing(true);
          setNewState(detectedState);
          // Auto-open the cross state modal with detected state
          setTimeout(() => {
            setShowCrossStateModal(true);
          }, 1000); // Small delay to let the page load
        }
        
        setCheckingLocation(false);
        setGpsPermission('granted');
      },
      (error) => {
        console.log('GPS Error:', error.message);
        setCheckingLocation(false);
        
        if (error.code === 1) {
          setGpsPermission('denied');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // Cache location for 1 minute
      }
    );
  }, [incompleteEntry, showCrossStateModal]);

  // Check for incomplete entries when entering mileage mode
  useEffect(() => {
    if (trackingMode === 'mileage' && selectedTruck) {
      checkForIncompleteEntry();
    }
  }, [trackingMode, selectedTruck, checkForIncompleteEntry]);

  // Check GPS location when incomplete entry is found
  useEffect(() => {
    if (incompleteEntry && trackingMode === 'mileage') {
      // Wait a bit for the page to render, then check GPS
      const timer = setTimeout(() => {
        checkGPSLocation();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [incompleteEntry, trackingMode, checkGPSLocation]);
  
  // Dark mode effect
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);
  
  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Fetch week data when entering week-at-a-glance mode
  useEffect(() => {
    if (trackingMode === 'week-at-a-glance') {
      const fetchWeekData = async () => {
        setLoadingWeekData(true);
        try {
          const response = await fetch('https://mileage-tracker-final.vercel.app/api/get-week-summary');
          const data = await response.json();
          if (data.success) {
            setWeekData(data);
          }
        } catch (error) {
          console.error('Error fetching week data:', error);
        } finally {
          setLoadingWeekData(false);
        }
      };
      fetchWeekData();
    }
  }, [trackingMode]);
  
  // Fetch fleet status when entering fleet-status mode
  useEffect(() => {
    if (trackingMode === 'fleet-status') {
      const fetchFleetStatus = async () => {
        setLoadingFleetStatus(true);
        try {
          const response = await fetch('https://mileage-tracker-final.vercel.app/api/get-fleet-status');
          const data = await response.json();
          if (data.success) {
            setFleetStatus(data);
          }
        } catch (error) {
          console.error('Error fetching fleet status:', error);
        } finally {
          setLoadingFleetStatus(false);
        }
      };
      fetchFleetStatus();
    }
  }, [trackingMode]);

  // Handle login
  const handleLogin = () => {
    const isBatchMgr = BATCH_MANAGERS.includes(currentDriver);
    
    if (currentDriver && (currentDriver !== 'Other' || customDriverName.trim())) {
      setIsLoggedIn(true);
      setIsBatchManager(isBatchMgr);
      
      // Batch managers/supervisors go to supervisor menu (not directly to daily report)
      if (isBatchMgr) {
        setTrackingMode('supervisor-menu');
      }
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
      // If batch manager, logout instead of going back to truck selection
      if (isBatchManager) {
        handleLogout();
        return;
      }
      
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

  // Handle crossing state line
  const handleCrossStateLine = async (e) => {
    e.preventDefault();
    
    if (!crossStateMileage || parseFloat(crossStateMileage) <= 0) {
      setSubmitStatus({ type: 'error', message: 'Please enter a valid mileage reading' });
      return;
    }
    
    if (parseFloat(crossStateMileage) <= parseFloat(incompleteEntry.mileageStart)) {
      setSubmitStatus({ type: 'error', message: 'Current mileage must be greater than starting mileage' });
      return;
    }
    
    const driverName = currentDriver === 'Other' ? customDriverName : currentDriver;
    
    try {
      // Step 1: Complete the current shift in the current state
      const completeResponse = await fetch('https://mileage-tracker-final.vercel.app/api/mileage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete',
          entryId: incompleteEntry.id,
          mileageEnd: parseFloat(crossStateMileage)
        }),
      });
      
      if (!completeResponse.ok) {
        throw new Error('Failed to complete current shift');
      }
      
      // Step 2: Start a new shift in the new state
      const startResponse = await fetch('https://mileage-tracker-final.vercel.app/api/mileage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          driver: driverName,
          truck: selectedTruck,
          date: mileageData.date,
          state: newState,
          mileageStart: parseFloat(crossStateMileage),
          timestamp: new Date().toISOString()
        }),
      });
      
      if (!startResponse.ok) {
        throw new Error('Failed to start new shift in new state');
      }
      
      // Success! Close modal and refresh incomplete entry
      setShowCrossStateModal(false);
      setCrossStateMileage('');
      setDetectedStateCrossing(false);
      setSubmitStatus({ 
        type: 'success', 
        message: `✅ Crossed into ${newState}! Continue driving and complete shift when done.` 
      });
      
      // Refresh to get the new incomplete entry
      setTimeout(() => {
        checkForIncompleteEntry();
      }, 1000);
      
    } catch (error) {
      console.error('Error crossing state line:', error);
      setSubmitStatus({ type: 'error', message: 'Failed to process state line crossing. Please try again.' });
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
          // Fetch all completed trips for this driver/truck/date to show full journey
          try {
            const tripsResponse = await fetch(
              `https://mileage-tracker-final.vercel.app/api/get-daily-trips?driver=${encodeURIComponent(driverName)}&truck=${encodeURIComponent(selectedTruck)}&date=${mileageData.date}`
            );
            
            const tripsData = await tripsResponse.json();
            
            // Store completion data with all trips
            setCompletionData({
              driver: driverName,
              truck: selectedTruck,
              date: mileageData.date,
              trips: tripsData.trips || [],
              totalMiles: tripsData.totalMiles || totalMiles
            });
          } catch (fetchError) {
            console.error('Error fetching trips:', fetchError);
            // Fallback to single trip data
            setCompletionData({
              driver: driverName,
              truck: selectedTruck,
              date: mileageData.date,
              trips: [{
                state: mileageData.state,
                mileageStart: parseFloat(mileageData.mileageStart),
                mileageEnd: parseFloat(mileageData.mileageEnd),
                totalMiles: totalMiles,
                timestamp: new Date().toISOString()
              }],
              totalMiles: totalMiles
            });
          }
          
          // Show completion screen
          setShowCompletionScreen(true);
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
      name: dailyReportData.name,
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
          name: '',
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
  
  // Render Supervisor Menu (for batch managers/supervisors only)
  if (trackingMode === 'supervisor-menu') {
    return (
      <div className="App">
        <div className={`container ${animationClass}`}>
          <div className="header">
            <h1>📊 Supervisor Dashboard</h1>
            <p className="user-info">Welcome, {currentDriver}</p>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
          
          <div className="supervisor-menu">
            <button
              onClick={() => {
                setAnimationClass('slide-in-right');
                setTrackingMode('daily-report');
              }}
              className="supervisor-option-card"
            >
              <div className="option-icon">📋</div>
              <div className="option-title">Daily Job Report</div>
              <div className="option-description">Submit today's batch and driver info</div>
            </button>
            
            <button
              onClick={() => {
                setAnimationClass('slide-in-right');
                setTrackingMode('week-at-a-glance');
              }}
              className="supervisor-option-card"
            >
              <div className="option-icon">📊</div>
              <div className="option-title">Week at a Glance</div>
              <div className="option-description">View all drivers' weekly activity</div>
            </button>
            
            <button
              onClick={() => {
                setAnimationClass('slide-in-right');
                setTrackingMode('fleet-status');
              }}
              className="supervisor-option-card"
            >
              <div className="option-icon">🚛</div>
              <div className="option-title">Fleet Status</div>
              <div className="option-description">See who has which truck right now</div>
            </button>
          </div>
          
          <div className="dark-mode-toggle">
            <label>
              <input 
                type="checkbox" 
                checked={darkMode} 
                onChange={(e) => setDarkMode(e.target.checked)}
              />
              🌙 Dark Mode
            </label>
          </div>
          
          {!isOnline && (
            <div className="offline-banner">
              📵 Offline - You can still use the app. Changes will sync when back online.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Week at a Glance View (Supervisor only)
  if (trackingMode === 'week-at-a-glance') {
    return (
      <div className="App">
        <div className={`container ${animationClass}`}>
          <div className="header">
            <button onClick={() => {
              setAnimationClass('slide-in-left');
              setTrackingMode('supervisor-menu');
            }} className="btn btn-back">
              ← Back
            </button>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>

          <div className="week-container">
            <div className="week-header">
              <h2>📊 Week at a Glance</h2>
              {weekData && (
                <p className="week-date-range">
                  {new Date(weekData.startDate).toLocaleDateString()} - {new Date(weekData.endDate).toLocaleDateString()}
                </p>
              )}
            </div>

            {loadingWeekData && (
              <div className="info-message">
                <span className="loading-spinner"></span>
                Loading week data...
              </div>
            )}

            {!loadingWeekData && weekData && weekData.data && weekData.data.length === 0 && (
              <div className="info-message">
                No activity this week yet.
              </div>
            )}

            {!loadingWeekData && weekData && weekData.data && weekData.data.map((driverData, index) => (
              <div key={index} className="driver-card">
                <div className="driver-header">
                  <div className="driver-name">{driverData.driver}</div>
                  <div className="driver-truck">🚛 {driverData.truck}</div>
                </div>

                <div className="week-stats">
                  <div className="stat-box">
                    <div className="stat-label">Total Miles</div>
                    <div className="stat-value highlight">{driverData.totalMiles.toFixed(1)}</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Fuel Spent</div>
                    <div className="stat-value">${driverData.totalFuelCost.toFixed(2)}</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Nebraska</div>
                    <div className="stat-value">{driverData.nebraskaMiles.toFixed(1)} mi</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Kansas</div>
                    <div className="stat-value">{driverData.kansasMiles.toFixed(1)} mi</div>
                  </div>
                </div>

                <div className="daily-breakdown">
                  {Object.entries(driverData.days).map(([date, dayData]) => (
                    <div key={date} className="daily-row">
                      <div className="day-label">
                        {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
                      </div>
                      <div className="daily-value">
                        {dayData.miles > 0 ? `${dayData.miles.toFixed(1)} mi` : '---'}
                      </div>
                      <div className="daily-value">
                        {dayData.fuelCost > 0 ? `$${dayData.fuelCost.toFixed(2)}` : '---'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Fleet Status View (Supervisor only)
  if (trackingMode === 'fleet-status') {
    const handleRefreshFleet = async () => {
      setLoadingFleetStatus(true);
      try {
        const response = await fetch('https://mileage-tracker-final.vercel.app/api/get-fleet-status');
        const data = await response.json();
        if (data.success) {
          setFleetStatus(data);
        }
      } catch (error) {
        console.error('Error fetching fleet status:', error);
      } finally {
        setLoadingFleetStatus(false);
      }
    };

    return (
      <div className="App">
        <div className={`container ${animationClass}`}>
          <div className="header">
            <button onClick={() => {
              setAnimationClass('slide-in-left');
              setTrackingMode('supervisor-menu');
            }} className="btn btn-back">
              ← Back
            </button>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>

          <div className="week-container">
            <div className="week-header">
              <h2>🚛 Fleet Status</h2>
              {fleetStatus && (
                <p className="week-date-range">
                  {fleetStatus.date} at {fleetStatus.time}
                </p>
              )}
            </div>

            {loadingFleetStatus && (
              <div className="info-message">
                <span className="loading-spinner"></span>
                Loading fleet status...
              </div>
            )}

            {!loadingFleetStatus && fleetStatus && (
              <>
                <div className="fleet-grid">
                  {fleetStatus.fleetStatus && fleetStatus.fleetStatus.map((truck, index) => (
                    <div key={index} className={`fleet-card ${truck.status === 'In Use' ? 'in-use' : 'available'}`}>
                      <span className={`truck-status-badge ${truck.status === 'In Use' ? 'in-use' : 'available'}`}>
                        {truck.status}
                      </span>
                      <div className="fleet-truck-name">🚛 {truck.truck}</div>

                      {truck.status === 'In Use' ? (
                        <>
                          <div className="fleet-detail">
                            <span className="fleet-label">Driver:</span>
                            <span className="fleet-value">{truck.driver}</span>
                          </div>
                          <div className="fleet-detail">
                            <span className="fleet-label">Started:</span>
                            <span className="fleet-value">{truck.startTime}</span>
                          </div>
                          <div className="fleet-detail">
                            <span className="fleet-label">Start Mileage:</span>
                            <span className="fleet-value">{truck.startMileage.toFixed(1)}</span>
                          </div>
                          <div className="fleet-detail">
                            <span className="fleet-label">State:</span>
                            <span className="fleet-value">{truck.state}</span>
                          </div>
                        </>
                      ) : (
                        <p style={{ color: '#48bb78', textAlign: 'center', marginTop: '20px', fontWeight: '600' }}>
                          Ready for use
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ textAlign: 'center' }}>
                  <button 
                    onClick={handleRefreshFleet} 
                    className="refresh-button"
                    disabled={loadingFleetStatus}
                  >
                    {loadingFleetStatus ? (
                      <>
                        <span className="loading-spinner"></span>
                        Refreshing...
                      </>
                    ) : (
                      '🔄 Refresh Status'
                    )}
                  </button>
                  <p className="fleet-timestamp">
                    Updates every time you refresh. Auto-refresh coming soon.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render truck selection screen (skip for batch managers)
  if (!selectedTruck && !isBatchManager) {
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

    // Show completion screen after successful submission
    if (showCompletionScreen && completionData) {
      // Group trips by state
      const tripsByState = {};
      let overallStart = null;
      let overallEnd = null;
      
      if (completionData.trips && completionData.trips.length > 0) {
        completionData.trips.forEach(trip => {
          if (!tripsByState[trip.state]) {
            tripsByState[trip.state] = [];
          }
          tripsByState[trip.state].push(trip);
          
          // Track overall start and end
          if (overallStart === null || trip.mileageStart < overallStart) {
            overallStart = trip.mileageStart;
          }
          if (overallEnd === null || trip.mileageEnd > overallEnd) {
            overallEnd = trip.mileageEnd;
          }
        });
      }
      
      return (
        <div className="App">
          <div className={`container ${animationClass}`}>
            <div className="completion-screen">
              <div className="completion-icon">✅</div>
              <h1>Shift Completed!</h1>
              <p className="completion-message">Your mileage has been successfully recorded.</p>
              
              <div className="completion-summary">
                <h3>Trip Summary</h3>
                <div className="summary-row">
                  <span className="summary-label">Driver:</span>
                  <span className="summary-value">{completionData.driver}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Truck:</span>
                  <span className="summary-value">{completionData.truck}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Date:</span>
                  <span className="summary-value">{new Date(completionData.date).toLocaleDateString()}</span>
                </div>
                
                {/* Show breakdown by state */}
                {Object.keys(tripsByState).length > 0 && (
                  <>
                    <div className="state-breakdown-header">State Breakdown:</div>
                    {Object.keys(tripsByState).map(state => {
                      const stateTrips = tripsByState[state];
                      const stateMiles = stateTrips.reduce((sum, trip) => sum + trip.totalMiles, 0);
                      const stateStart = Math.min(...stateTrips.map(t => t.mileageStart));
                      const stateEnd = Math.max(...stateTrips.map(t => t.mileageEnd));
                      
                      return (
                        <div key={state} className="state-section">
                          <div className="state-header">📍 {state}</div>
                          <div className="summary-row state-detail">
                            <span className="summary-label">Start:</span>
                            <span className="summary-value">{stateStart.toFixed(1)}</span>
                          </div>
                          <div className="summary-row state-detail">
                            <span className="summary-label">End:</span>
                            <span className="summary-value">{stateEnd.toFixed(1)}</span>
                          </div>
                          <div className="summary-row state-detail state-miles">
                            <span className="summary-label">Miles:</span>
                            <span className="summary-value">{stateMiles.toFixed(1)} mi</span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                
                <div className="summary-row total">
                  <span className="summary-label">Total Miles:</span>
                  <span className="summary-value">{completionData.totalMiles.toFixed(1)} miles</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowCompletionScreen(false);
                  setCompletionData(null);
                  setTrackingMode(null);
                  setAnimationClass('slide-in-left');
                }}
                className="btn btn-primary btn-large"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      );
    }

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

          {checkingLocation && (
            <div className="info-message">
              🌍 Checking your location...
            </div>
          )}

          {detectedStateCrossing && !showCrossStateModal && (
            <div className="gps-detection-notice">
              📍 <strong>State Crossing Detected!</strong>
              <p>GPS shows you're now in <strong>{newState}</strong></p>
              <p>Your shift started in <strong>{incompleteEntry.state}</strong></p>
              <p>Click "Cross State Line" below to split your shift.</p>
            </div>
          )}

          {gpsPermission === 'denied' && incompleteEntry && (
            <div className="gps-permission-notice">
              ℹ️ <strong>Location Permission Needed</strong>
              <p>Enable location access to auto-detect state crossings.</p>
              <p>You can still use the "Cross State Line" button manually.</p>
            </div>
          )}

          {incompleteEntry && !showCrossStateModal && (
            <button 
              type="button"
              onClick={() => {
                setShowCrossStateModal(true);
                // Set the opposite state as default
                setNewState(incompleteEntry.state === 'Nebraska' ? 'Kansas' : 'Nebraska');
              }}
              className="btn btn-secondary"
              style={{ marginBottom: '20px', width: '100%' }}
            >
              🚗 Cross State Line
            </button>
          )}

          {showCrossStateModal && (
            <div className="cross-state-modal">
              <h3>{detectedStateCrossing ? '📍 GPS Detected State Crossing' : 'Crossing State Line'}</h3>
              <p>You're leaving <strong>{incompleteEntry.state}</strong></p>
              {detectedStateCrossing && (
                <p style={{ color: '#2196f3', fontWeight: 600 }}>
                  GPS detected you're now in {newState}
                </p>
              )}
              
              <form onSubmit={handleCrossStateLine} className="tracking-form">
                <div className="form-group">
                  <label htmlFor="cross-mileage">Current Odometer Reading:</label>
                  <input
                    id="cross-mileage"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={crossStateMileage}
                    onChange={(e) => setCrossStateMileage(e.target.value)}
                    placeholder="Enter current mileage"
                    required
                    autoFocus
                    className="text-input"
                  />
                  <small style={{ color: '#718096', marginTop: '5px', display: 'block' }}>
                    Must be greater than {incompleteEntry.mileageStart}
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="new-state">Entering State:</label>
                  <select
                    id="new-state"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    required
                    className="select-input"
                  >
                    {STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    Confirm State Crossing
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowCrossStateModal(false);
                      setCrossStateMileage('');
                      setDetectedStateCrossing(false);
                    }}
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {!showCrossStateModal && (
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
          )}
        </div>
      </div>
    );
  }

  // Render fuel tracking form
  if (trackingMode === 'fuel') {
    const displayName = currentDriver === 'Other' ? customDriverName : currentDriver;
    const isSemi = selectedTruck === 'Green Semi';
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
              <label htmlFor="report-name">Name:</label>
              <input
                id="report-name"
                type="text"
                value={dailyReportData.name}
                onChange={(e) => setDailyReportData({...dailyReportData, name: e.target.value})}
                placeholder="Enter your name"
                required
                className="text-input"
              />
            </div>

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
