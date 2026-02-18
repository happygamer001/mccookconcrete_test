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
      return res.status(400).json({ error: 'Driver and truck are required' });
    }

    const notionApiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_MILEAGE_DB_ID;

    if (!notionApiKey || !databaseId) {
      return res.status(500).json({ error: 'Missing environment variables' });
    }

    // Query Notion for incomplete entries
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
            property: 'Date',
            direction: 'descending'
          }
        ],
        page_size: 1
      })
    });

    const data = await notionRes.json();

    if (!notionRes.ok) {
      console.error('Notion error:', JSON.stringify(data));
      return res.status(500).json({ error: 'Notion API error', details: data });
    }

    // Return the most recent incomplete entry, if any
    if (data.results && data.results.length > 0) {
      const entry = data.results[0];
      
      return res.status(200).json({
        found: true,
        entry: {
          id: entry.id,
          date: entry.properties.Date?.date?.start || '',
          state: entry.properties.State?.select?.name || '',
          mileageStart: entry.properties['Mileage Start']?.number || 0,
          createdTime: entry.created_time
        }
      });
    } else {
      return res.status(200).json({ found: false });
    }

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message });
  }
};
