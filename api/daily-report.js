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
    const { 
      date, 
      yardsOut, 
      tripsOut, 
      drivers, 
      fuelReading, 
      issues, 
      issuePhoto,
      preparedBy 
    } = req.body;

    const notionApiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DAILY_REPORT_DB_ID;

    if (!notionApiKey || !databaseId) {
      return res.status(500).json({ 
        success: false, 
        error: 'Missing environment variables',
        debug: {
          hasApiKey: !!notionApiKey,
          hasDbId: !!databaseId,
          apiKeyLength: notionApiKey?.length || 0,
          dbIdLength: databaseId?.length || 0
        }
      });
    }

    const properties = {
      'Name': {
        title: [{ text: { content: `Daily Report - ${date}` } }]
      },
      'Report Date': {
        date: { start: date }
      },
      'Total Yards Out': {
        number: parseFloat(yardsOut)
      },
      'Trips Out': {
        number: parseFloat(tripsOut)
      },
      'End of Day Fuel Reading': {
        number: parseFloat(fuelReading)
      },
      'Issues Presented': {
        rich_text: [{ text: { content: issues || 'N/A' } }]
      },
      'Submitted By': {
        rich_text: [{ text: { content: preparedBy } }]
      }
    };

    if (drivers && drivers.length > 0) {
      drivers.forEach((driver, index) => {
        if (index < 5 && driver.name) {
          const num = index + 1;
          properties[`Driver ${num} Name`] = {
            rich_text: [{ text: { content: driver.name } }]
          };
          
          const hours = driver.halfDay ? 4 : driver.fullDay ? 8 : 0;
          if (hours > 0) {
            properties[`Driver ${num} Hours`] = { number: hours };
          }
        }
      });
    }

    if (issuePhoto) {
      properties['Issue Photos'] = {
        files: [{
          name: `issue-photo-${Date.now()}.jpg`,
          external: { url: issuePhoto }
        }]
      };
    }

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
        details: notionData
      });
    }

    return res.status(200).json({ success: true, id: notionData.id });

  }} catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack,
      details: 'Check function name and database ID'
    });
  }

;
