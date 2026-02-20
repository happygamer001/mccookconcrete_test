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
    const { 
      entryId, 
      entryType, 
      changes, 
      supervisorName, 
      reason,
      originalDriver,
      originalTruck,
      originalDate
    } = req.body;

    if (!entryId || !entryType || !changes || !supervisorName || !reason) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: entryId, entryType, changes, supervisorName, reason' 
      });
    }

    const notionApiKey = process.env.NOTION_API_KEY;
    const changeLogDatabaseId = process.env.NOTION_CHANGE_LOG_DB_ID;

    if (!notionApiKey || !changeLogDatabaseId) {
      return res.status(500).json({ 
        success: false, 
        error: 'Missing environment variables' 
      });
    }

    // Step 1: Update the original entry
    const updatePayload = {
      properties: {}
    };

    // Build update payload based on changes
    for (const [field, values] of Object.entries(changes)) {
      const { newValue, propertyType } = values;
      
      if (propertyType === 'number') {
        updatePayload.properties[field] = { number: parseFloat(newValue) };
      } else if (propertyType === 'select') {
        updatePayload.properties[field] = { select: { name: newValue } };
      } else if (propertyType === 'date') {
        updatePayload.properties[field] = { date: { start: newValue } };
      } else if (propertyType === 'rich_text') {
        updatePayload.properties[field] = { 
          rich_text: [{ text: { content: newValue } }] 
        };
      }
    }

    // Update the original entry
    const updateRes = await fetch(`https://api.notion.com/v1/pages/${entryId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateRes.ok) {
      const errorData = await updateRes.json();
      console.error('Notion update error:', JSON.stringify(errorData));
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update entry'
      });
    }

    // Step 2: Create change log entries (one for each field changed)
    const changeLogPromises = [];

    for (const [field, values] of Object.entries(changes)) {
      const { oldValue, newValue } = values;
      
      const changeLogEntry = {
        parent: { database_id: changeLogDatabaseId },
        properties: {
          'Entry Type': {
            select: { name: entryType === 'mileage' ? 'Mileage' : 'Fuel' }
          },
          'Original Entry ID': {
            rich_text: [{ text: { content: entryId } }]
          },
          'Driver Name': {
            rich_text: [{ text: { content: originalDriver || 'Unknown' } }]
          },
          'Truck Number': {
            rich_text: [{ text: { content: originalTruck || 'Unknown' } }]
          },
          'Date': {
            date: { start: originalDate || new Date().toISOString().split('T')[0] }
          },
          'Field Changed': {
            select: { name: field }
          },
          'Old Value': {
            rich_text: [{ text: { content: String(oldValue) } }]
          },
          'New Value': {
            rich_text: [{ text: { content: String(newValue) } }]
          },
          'Supervisor Name': {
            rich_text: [{ text: { content: supervisorName } }]
          },
          'Reason': {
            rich_text: [{ text: { content: reason } }]
          }
        }
      };

      // Create change log entry
      const logPromise = fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionApiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify(changeLogEntry)
      });

      changeLogPromises.push(logPromise);
    }

    // Wait for all change log entries to be created
    await Promise.all(changeLogPromises);

    return res.status(200).json({
      success: true,
      message: 'Entry updated and change log created',
      changesCount: Object.keys(changes).length
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
