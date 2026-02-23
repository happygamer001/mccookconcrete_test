// API endpoint: /api/capacity-data.js
// Fetches mileage data and calculates daily capacity metrics

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Missing startDate or endDate parameters' });
    }

    const notionApiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_MILEAGE_DB_ID;

    if (!notionApiKey || !databaseId) {
      return res.status(500).json({ error: 'Missing environment variables' });
    }

    // Query Notion for mileage entries in date range
    const response = await fetch('https://api.notion.com/v1/databases/' + databaseId + '/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          and: [
            {
              property: 'Date',
              date: {
                on_or_after: startDate
              }
            },
            {
              property: 'Date',
              date: {
                on_or_before: endDate
              }
            },
            {
              property: 'Status',
              status: {
                equals: 'Done'
              }
            }
          ]
        },
        sorts: [
          {
            property: 'Date',
            direction: 'ascending'
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Notion API error:', data);
      return res.status(500).json({ error: 'Failed to fetch data from Notion' });
    }

    // Process results and group by date
    const dailyData = {};
    const truckSet = new Set();

    data.results.forEach(entry => {
      const date = entry.properties.Date?.date?.start;
      const truck = entry.properties['Truck Number']?.select?.name;
      const driver = entry.properties['Driver Name']?.select?.name;

      if (!date) return;

      if (!dailyData[date]) {
        dailyData[date] = {
          date: date,
          loads: 0,
          trucks: new Set(),
          drivers: new Set()
        };
      }

      dailyData[date].loads += 1;
      if (truck) {
        dailyData[date].trucks.add(truck);
        truckSet.add(truck);
      }
      if (driver) dailyData[date].drivers.add(driver);
    });

    // Convert to array and add capacity calculations
    const totalTrucks = truckSet.size || 4; // Default to 4 if no data
    const avgLoadsPerTruck = 12.5; // Industry standard
    const maxCapacity = totalTrucks * avgLoadsPerTruck;

    const dailyArray = Object.values(dailyData).map(day => ({
      date: day.date,
      loads: day.loads,
      maxCapacity: maxCapacity,
      trucksActive: day.trucks.size,
      utilizationPercent: Math.round((day.loads / maxCapacity) * 100),
      drivers: Array.from(day.drivers)
    }));

    // Calculate summary metrics
    const totalLoads = dailyArray.reduce((sum, day) => sum + day.loads, 0);
    const avgDailyLoads = dailyArray.length > 0 ? Math.round(totalLoads / dailyArray.length) : 0;
    const avgUtilization = dailyArray.length > 0 
      ? Math.round(dailyArray.reduce((sum, day) => sum + day.utilizationPercent, 0) / dailyArray.length)
      : 0;
    const peakDay = dailyArray.reduce((max, day) => day.loads > max.loads ? day : max, { loads: 0 });

    // Calculate trend (compare first half to second half)
    const midpoint = Math.floor(dailyArray.length / 2);
    const firstHalf = dailyArray.slice(0, midpoint);
    const secondHalf = dailyArray.slice(midpoint);
    
    const firstHalfAvg = firstHalf.length > 0 
      ? firstHalf.reduce((sum, day) => sum + day.loads, 0) / firstHalf.length 
      : 0;
    const secondHalfAvg = secondHalf.length > 0 
      ? secondHalf.reduce((sum, day) => sum + day.loads, 0) / secondHalf.length 
      : 0;
    
    const trendPercent = firstHalfAvg > 0 
      ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)
      : 0;

    return res.status(200).json({
      success: true,
      dateRange: {
        start: startDate,
        end: endDate
      },
      summary: {
        totalLoads,
        avgDailyLoads,
        avgUtilization,
        peakDay: {
          date: peakDay.date,
          loads: peakDay.loads
        },
        trendPercent,
        totalTrucks,
        maxCapacity
      },
      dailyData: dailyArray
    });

  } catch (error) {
    console.error('Error fetching capacity data:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch capacity data',
      message: error.message 
    });
  }
};
