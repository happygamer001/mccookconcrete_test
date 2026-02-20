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
    const { type, days } = req.query; // type: 'mileage' or 'fuel', days: number of days back
    
    const notionApiKey = process.env.NOTION_API_KEY;
    const mileageDatabaseId = process.env.NOTION_MILEAGE_DB_ID;
    const fuelDatabaseId = process.env.NOTION_FUEL_DB_ID;

    if (!notionApiKey || !mileageDatabaseId || !fuelDatabaseId) {
      return res.status(500).json({ 
        success: false, 
        error: 'Missing environment variables' 
      });
    }

    const daysBack = parseInt(days) || 7; // Default to last 7 days
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysBack);
    const dateFilter = dateThreshold.toISOString().split('T')[0];

    // Determine which database to query
    const databaseId = type === 'fuel' ? fuelDatabaseId : mileageDatabaseId;

    // Query Notion database
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          property: 'Date',
          date: {
            on_or_after: dateFilter
          }
        },
        sorts: [
          {
            property: 'Timestamp',
            direction: 'descending'
          }
        ],
        page_size: 50 // Limit to last 50 entries
      })
    });

    const notionData = await notionRes.json();

    if (!notionRes.ok) {
      console.error('Notion error:', JSON.stringify(notionData));
      return res.status(500).json({ 
        success: false, 
        error: notionData.message || 'Notion API error'
      });
    }

    // Parse entries
    const entries = [];

    if (notionData.results && notionData.results.length > 0) {
      notionData.results.forEach(page => {
        if (type === 'mileage') {
          entries.push({
            id: page.id,
            driver: page.properties['Driver Name']?.select?.name || '',
            truck: page.properties['Truck Number']?.select?.name || '',
            date: page.properties['Date']?.date?.start || '',
            state: page.properties['State']?.select?.name || '',
            mileageStart: page.properties['Mileage Start']?.number || 0,
            mileageEnd: page.properties['Mileage End']?.number || 0,
            totalMiles: (page.properties['Mileage End']?.number || 0) - (page.properties['Mileage Start']?.number || 0),
            status: page.properties['Status']?.status?.name || '',
            timestamp: page.created_time
          });
        } else {
          // Fuel entries
          entries.push({
            id: page.id,
            driver: page.properties['Driver Name']?.select?.name || '',
            truck: page.properties['Truck Number']?.select?.name || '',
            date: page.properties['Date']?.date?.start || '',
            state: page.properties['State']?.select?.name || '',
            gallons: page.properties['Gallons']?.number || 0,
            cost: page.properties['Total Cost']?.number || 0,
            location: page.properties['Location']?.rich_text?.[0]?.plain_text || '',
            timestamp: page.created_time
          });
        }
      });
    }

    return res.status(200).json({
      success: true,
      type: type,
      entries: entries,
      count: entries.length
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
