module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { 
      name,
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
        error: 'Missing environment variables: NOTION_API_KEY or NOTION_DAILY_REPORT_DB_ID' 
      });
    }

    // Build driver properties (up to 5 drivers)
    const driverProps = {};
    drivers.forEach((driver, index) => {
      if (driver.name && driver.hours) {
        driverProps[`Driver ${index + 1} Name`] = {
          rich_text: [{ text: { content: driver.name } }]
        };
        driverProps[`Driver ${index + 1} Hours`] = {
          number: parseFloat(driver.hours)
        };
      }
    });

    // Build Notion page properties
    const properties = {
      'Name': {
        title: [{ text: { content: `Daily Report - ${date}` } }]
      },
      'Reporter Name': {
        rich_text: [{ text: { content: name || 'Not provided' } }]
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
      ...driverProps,
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

    // Handle photo upload if provided
    if (issuePhoto) {
      // Photo is base64 encoded - we need to upload it to Notion
      // Notion API requires external URL, so we'll include it as a link
      // For now, we'll store the base64 in the issues field with a note
      // In production, you'd upload to cloud storage first
      properties['Issue Photos'] = {
        files: [{
          name: `issue-photo-${Date.now()}.jpg`,
          external: { url: issuePhoto } // This will be a base64 data URL
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
      return res.status(500).json({ 
        success: false, 
        error: notionData.message || 'Notion API error' 
      });
    }

    return res.status(200).json({ success: true, id: notionData.id });

  } catch (error) {
    console.error('Server error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};
