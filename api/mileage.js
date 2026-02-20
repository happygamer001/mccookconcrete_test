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
      action, driver, truck, date, state, mileageStart, mileageEnd, totalMiles, entryId,
      jobSiteArrivalTime, jobSiteDepartureTime, totalDeliveryTime, totalJobSiteTime
    } = req.body;

    const notionApiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_MILEAGE_DB_ID;

    if (!notionApiKey || !databaseId) {
      return res.status(500).json({ success: false, error: 'Missing environment variables: NOTION_API_KEY or NOTION_MILEAGE_DB_ID' });
    }

    // Handle "complete" action - update existing entry
    if (action === 'complete') {
      if (!entryId || !mileageEnd) {
        return res.status(400).json({ success: false, error: 'Missing entryId or mileageEnd for complete action' });
      }

      // Build properties object
      const properties = {
        'Mileage End': { number: mileageEnd },
        'Status': { status: { name: 'Done' } }
      };
      
      // Add job site times if provided
      if (jobSiteArrivalTime) {
        properties['Job Site Arrival'] = { 
          rich_text: [{ text: { content: jobSiteArrivalTime } }] 
        };
      }
      
      if (jobSiteDepartureTime) {
        properties['Job Site Departure'] = { 
          rich_text: [{ text: { content: jobSiteDepartureTime } }] 
        };
      }
      
      // Add calculated times if provided
      if (totalDeliveryTime !== undefined && totalDeliveryTime !== null) {
        properties['Total Delivery Time (hrs)'] = { number: totalDeliveryTime };
      }
      
      if (totalJobSiteTime !== undefined && totalJobSiteTime !== null) {
        properties['Total Job Site Time (hrs)'] = { number: totalJobSiteTime };
      }

      const notionRes = await fetch(`https://api.notion.com/v1/pages/${entryId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${notionApiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({ properties })
      });

      const notionData = await notionRes.json();

      if (!notionRes.ok) {
        console.error('Notion error:', JSON.stringify(notionData));
        return res.status(500).json({ success: false, error: notionData.message || 'Notion API error' });
      }

      return res.status(200).json({ success: true, id: notionData.id });
    }

    // Handle "start" action - create new entry
    if (action === 'start') {
      if (!driver || !truck || !date || !state || mileageStart === undefined) {
        return res.status(400).json({ success: false, error: 'Missing required fields for start action' });
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
          properties: {
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
            'Mileage Start': {
              number: mileageStart
            },
            'Status': {
              status: { name: 'In progress' }
            }
          }
        })
      });

      const notionData = await notionRes.json();

      if (!notionRes.ok) {
        console.error('Notion error:', JSON.stringify(notionData));
        return res.status(500).json({ success: false, error: notionData.message || 'Notion API error' });
      }

      return res.status(200).json({ success: true, id: notionData.id });
    }

    // If no action specified, return error
    return res.status(400).json({ success: false, error: 'Missing or invalid action parameter' });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
