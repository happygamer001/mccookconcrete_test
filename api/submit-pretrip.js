module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { driver, truck, date, checklist } = req.body;

    if (!driver || !truck || !date || !checklist) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: driver, truck, date, checklist' 
      });
    }

    const notionApiKey = process.env.NOTION_API_KEY;
    const preTripDatabaseId = process.env.NOTION_PRETRIP_DB_ID;

    if (!notionApiKey || !preTripDatabaseId) {
      return res.status(500).json({ 
        success: false, 
        error: 'Missing environment variables' 
      });
    }

    // Determine if this was an "All Good" bypass
    const allGood = checklist.issues === 'No issues - all good';

    // Create entry in Notion
    const payload = {
      parent: { database_id: preTripDatabaseId },
      properties: {
        'Driver Name': {
          select: { name: driver }
        },
        'Truck Number': {
          select: { name: truck }
        },
        'Date': {
          date: { start: date }
        },
        'Tires': {
          checkbox: checklist.tires || false
        },
        'Oil Level': {
          checkbox: checklist.oilLevel || false
        },
        'Belts/Hoses': {
          checkbox: checklist.beltsHoses || false
        },
        'Mirrors': {
          checkbox: checklist.mirrors || false
        },
        'Windshield Wipers': {
          checkbox: checklist.windshieldWipers || false
        },
        'Lights': {
          checkbox: checklist.lights || false
        },
        'Headlights': {
          checkbox: checklist.headlights || false
        },
        'Brake Lights': {
          checkbox: checklist.brakeLights || false
        },
        'Turn Signals': {
          checkbox: checklist.turnSignals || false
        },
        'Hazard Lights': {
          checkbox: checklist.hazardLights || false
        },
        'Safety Equipment': {
          checkbox: checklist.safetyEquipment || false
        },
        'Has Trailer': {
          checkbox: checklist.hasTrailer || false
        },
        'Coupler': {
          checkbox: checklist.coupler || false
        },
        'Safety Chains': {
          checkbox: checklist.safetyChains || false
        },
        'Issues': {
          rich_text: [
            {
              text: {
                content: checklist.issues || ''
              }
            }
          ]
        },
        'All Good': {
          checkbox: allGood
        }
      }
    };

    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify(payload)
    });

    const notionData = await notionRes.json();

    if (!notionRes.ok) {
      console.error('Notion error:', JSON.stringify(notionData));
      return res.status(500).json({ 
        success: false, 
        error: notionData.message || 'Notion API error'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Pre-trip checklist submitted successfully',
      id: notionData.id
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
