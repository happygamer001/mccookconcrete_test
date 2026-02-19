module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { driver, truck, date, state, gallons, cost, location, fuelPhoto } = req.body;

    const notionApiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_FUEL_DB_ID;

    if (!notionApiKey || !databaseId) {
      return res.status(500).json({ success: false, error: 'Missing environment variables: NOTION_API_KEY or NOTION_FUEL_DB_ID' });
    }

    // Build properties object - cost and location are optional (for Semi only)
    const properties = {
      'Entry ID': {
        title: [{ text: { content: `${driver} - ${truck} - ${date}` } }]
      },
      'Driver Name': {
        select: { name: driver }
      },
      'Truck Number': {
        select: { name: truck }
      },
      'Date': {
        date: { start: date }
      },
      'State': {
        select: { name: state }
      },
      'Gallons': {
        number: gallons
      }
    };

    // Add cost and location only if provided (for Semi)
    if (cost !== null && cost !== undefined) {
      properties['Total Cost'] = { number: cost };
    }

    if (location !== null && location !== undefined && location.trim() !== '') {
      properties['Location'] = {
        rich_text: [{ text: { content: location } }]
      };
    }

    // Skip photo for now - we'll handle this separately once the column is set up
    // if (fuelPhoto) {
    //   properties['Receipt Photo'] = {
    //     rich_text: [{ text: { content: fuelPhoto.substring(0, 2000) } }]
    //   };
    // }

    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: properties
      })
    });

    const notionData = await notionRes.json();

    if (!notionRes.ok) {
      console.error('Notion error:', JSON.stringify(notionData));
      return res.status(500).json({ 
        success: false, 
        error: notionData.message || 'Notion API error',
        details: notionData,
        sentProperties: Object.keys(properties)
      });
    }

    return res.status(200).json({ success: true, id: notionData.id });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
};
