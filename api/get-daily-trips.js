module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { driver, truck, date } = req.query;

    if (!driver || !truck || !date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required query parameters: driver, truck, and date' 
      });
    }

    const notionApiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_MILEAGE_DB_ID;

    if (!notionApiKey || !databaseId) {
      return res.status(500).json({ 
        success: false, 
        error: 'Missing environment variables' 
      });
    }

    // Query Notion database for all completed entries for this driver/truck/date
    const notionRes = await fetch('https://api.notion.com/v1/databases/' + databaseId + '/query', {
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
              property: 'Driver Name',
              select: {
                equals: driver
              }
            },
            {
              property: 'Truck Number',
              select: {
                equals: truck
              }
            },
            {
              property: 'Date',
              date: {
                equals: date
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
            property: 'Timestamp',
            direction: 'ascending'  // Chronological order
          }
        ]
      })
    });

    const notionData = await notionRes.json();

    if (!notionRes.ok) {
      console.error('Notion error:', JSON.stringify(notionData));
      return res.status(500).json({ 
        success: false, 
        error: notionData.message || 'Notion API error',
        details: notionData
      });
    }

    // Parse the trips
    const trips = [];
    let totalMiles = 0;

    if (notionData.results && notionData.results.length > 0) {
      notionData.results.forEach(page => {
        const mileageStart = page.properties['Mileage Start']?.number || 0;
        const mileageEnd = page.properties['Mileage End']?.number || 0;
        const tripMiles = mileageEnd - mileageStart;
        
        trips.push({
          state: page.properties['State']?.select?.name || '',
          mileageStart: mileageStart,
          mileageEnd: mileageEnd,
          totalMiles: tripMiles,
          timestamp: page.created_time
        });
        
        totalMiles += tripMiles;
      });
    }

    return res.status(200).json({
      success: true,
      trips: trips,
      totalMiles: totalMiles,
      count: trips.length
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
