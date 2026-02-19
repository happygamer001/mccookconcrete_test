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
    const { driver, truck } = req.query;

    if (!driver || !truck) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required query parameters: driver and truck' 
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

    // Query Notion database for incomplete entries matching BOTH driver AND truck
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
        ],
        page_size: 1
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

    // If we found an incomplete entry
    if (notionData.results && notionData.results.length > 0) {
      const page = notionData.results[0];
      
      // Extract the data from Notion's format
      const entry = {
        id: page.id,
        driver: page.properties['Driver Name']?.select?.name || driver,
        truck: page.properties['Truck Number']?.select?.name || truck,
        date: page.properties['Date']?.date?.start || '',
        state: page.properties['State']?.select?.name || '',
        mileageStart: page.properties['Mileage Start']?.number || 0,
        createdTime: page.created_time
      };

      return res.status(200).json({
        found: true,
        entry: entry
      });
    } else {
      // No incomplete entry found
      return res.status(200).json({
        found: false,
        entry: null
      });
    }

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
};
