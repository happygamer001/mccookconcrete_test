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
    const databaseId = process.env.NOTION_MILEAGE_DB_ID;

    if (!notionApiKey || !databaseId) {
      return res.status(500).json({ 
        success: false, 
        error: 'Missing environment variables' 
      });
    }

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Query for all incomplete (In progress) shifts today
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
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
                equals: today
              }
            },
            {
              property: 'Status',
              status: {
                equals: 'In progress'
              }
            }
          ]
        },
        sorts: [
          {
            property: 'Timestamp',
            direction: 'descending'
          }
        ]
      })
    });

    const notionData = await notionRes.json();

    // All available trucks
    const allTrucks = ['Green Semi', 'Dump Truck (2525)', '2500', '2502', '2503', '2504', '2507'];
    
    // Build fleet status
    const fleetStatus = allTrucks.map(truck => {
      const entry = notionData.results?.find(page => 
        page.properties['Truck Number']?.select?.name === truck
      );

      if (entry) {
        return {
          truck,
          status: 'In Use',
          driver: entry.properties['Driver Name']?.select?.name || 'Unknown',
          startTime: new Date(entry.created_time).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
          }),
          startMileage: entry.properties['Mileage Start']?.number || 0,
          state: entry.properties['State']?.select?.name || ''
        };
      } else {
        return {
          truck,
          status: 'Available',
          driver: null,
          startTime: null,
          startMileage: null,
          state: null
        };
      }
    });

    return res.status(200).json({
      success: true,
      date: today,
      time: new Date().toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        second: '2-digit'
      }),
      fleetStatus
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
