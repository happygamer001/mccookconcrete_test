module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const notionApiKey = process.env.NOTION_API_KEY;
    const mileageDatabaseId = process.env.NOTION_MILEAGE_DB_ID;
    const fuelDatabaseId = process.env.NOTION_FUEL_DB_ID;

    if (!notionApiKey || !mileageDatabaseId || !fuelDatabaseId) {
      return res.status(500).json({ 
        success: false, 
        error: 'Missing environment variables' 
      });
    }

    // Get date range for current week (Monday - Today)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    
    const startDate = monday.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    // Fetch mileage data for the week
    const mileageRes = await fetch(`https://api.notion.com/v1/databases/${mileageDatabaseId}/query`, {
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

    const mileageData = await mileageRes.json();

    // Fetch fuel data for the week
    const fuelRes = await fetch(`https://api.notion.com/v1/databases/${fuelDatabaseId}/query`, {
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

    const fuelData = await fuelRes.json();

    // Process data by driver/truck/day
    const weekSummary = {};

    // Process mileage entries
    if (mileageData.results) {
      mileageData.results.forEach(page => {
        const driver = page.properties['Driver Name']?.select?.name || 'Unknown';
        const truck = page.properties['Truck Number']?.select?.name || 'Unknown';
        const date = page.properties['Date']?.date?.start || '';
        const miles = (page.properties['Mileage End']?.number || 0) - (page.properties['Mileage Start']?.number || 0);
        const state = page.properties['State']?.select?.name || '';

        const key = `${driver}-${truck}`;
        if (!weekSummary[key]) {
          weekSummary[key] = {
            driver,
            truck,
            days: {},
            totalMiles: 0,
            totalFuelCost: 0,
            nebraskaMiles: 0,
            kansasMiles: 0
          };
        }

        if (!weekSummary[key].days[date]) {
          weekSummary[key].days[date] = {
            miles: 0,
            fuelCost: 0
          };
        }

        weekSummary[key].days[date].miles += miles;
        weekSummary[key].totalMiles += miles;

        if (state === 'Nebraska') {
          weekSummary[key].nebraskaMiles += miles;
        } else if (state === 'Kansas') {
          weekSummary[key].kansasMiles += miles;
        }
      });
    }

    // Process fuel entries
    if (fuelData.results) {
      fuelData.results.forEach(page => {
        const driver = page.properties['Driver Name']?.select?.name || 'Unknown';
        const truck = page.properties['Truck Number']?.select?.name || 'Unknown';
        const date = page.properties['Date']?.date?.start || '';
        const cost = page.properties['Total Cost']?.number || 0;

        const key = `${driver}-${truck}`;
        if (!weekSummary[key]) {
          weekSummary[key] = {
            driver,
            truck,
            days: {},
            totalMiles: 0,
            totalFuelCost: 0,
            nebraskaMiles: 0,
            kansasMiles: 0
          };
        }

        if (!weekSummary[key].days[date]) {
          weekSummary[key].days[date] = {
            miles: 0,
            fuelCost: 0
          };
        }

        weekSummary[key].days[date].fuelCost += cost;
        weekSummary[key].totalFuelCost += cost;
      });
    }

    // Convert to array and sort by driver name
    const weekArray = Object.values(weekSummary).sort((a, b) => 
      a.driver.localeCompare(b.driver)
    );

    return res.status(200).json({
      success: true,
      startDate,
      endDate,
      data: weekArray
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
};
