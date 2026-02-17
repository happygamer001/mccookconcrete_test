export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
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

    // Check environment variables
    if (!notionApiKey || !databaseId) {
      res.status(500).json({ 
        success: false, 
        error: 'Missing environment variables',
        details: {
          hasApiKey: !!notionApiKey,
          hasDbId: !!databaseId
        }
      });
      return;
    }

    // Build Notion page properties
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

    // Add driver info to first 5 driver slots
    if (drivers && drivers.length > 0) {
      drivers.forEach((driver, index) => {
        if (index < 5 && driver.name) {
          const num = index + 1;
          properties[`Driver ${num} Name`] = {
            rich_text: [{ text: { content: driver.name } }]
          };
          
          // Store hours as: 4 for half day, 8 for full day
          const hours = driver.halfDay ? 4 : driver.fullDay ? 8 : 0;
          if (hours > 0) {
            properties[`Driver ${num} Hours`] = {
              number: hours
            };
          }
        }
      });
    }

    // Handle photo upload if provided
    if (issuePhoto) {
      properties['Issue Photos'] = {
        files: [{
          name: `issue-photo-${Date.now()}.jpg`,
          external: { url: issuePhoto }
        }]
      };
    }

    // Create Notion page
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
      res.status(500).json({ 
        success: false, 
        error: notionData.message || 'Notion API error',
        details: notionData
      });
      return;
    }

    res.status(200).json({ success: true, id: notionData.id });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
