// Daily Job Report API Endpoint
// Handles batch manager daily report submissions

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const notionApiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DAILY_REPORT_DB_ID;

    // Validate environment variables
    if (!notionApiKey) {
      console.error('Missing NOTION_API_KEY');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error: Missing API key' 
      });
    }

    if (!databaseId) {
      console.error('Missing NOTION_DAILY_REPORT_DB_ID');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error: Missing database ID' 
      });
    }

    // Parse request body
    const {
      name,           // Batch manager name
      date,
      yardsOut,       // Concrete delivered (yards)
      tripsOut,       // Trips/loads
      drivers,        // Array of driver statuses
      fuelReading,    // Fuel tank reading
      issues,         // Issues/notes
      preparedBy,     // Who submitted (same as name usually)
      timestamp       // Submission timestamp
    } = req.body;

    // Validate required fields
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: date' 
      });
    }

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: name (batch manager)' 
      });
    }

    // Build properties object for Notion
    const properties = {
      'Date': {
        date: {
          start: date
        }
      },
      'Batch Manager': {
        select: {
          name: name
        }
      }
    };

    // Add yards out (concrete delivered)
    if (yardsOut !== undefined && yardsOut !== null && yardsOut !== '') {
      properties['Concrete Delivered (yards)'] = {
        number: parseFloat(yardsOut)
      };
    }

    // Add trips out
    if (tripsOut !== undefined && tripsOut !== null && tripsOut !== '') {
      properties['Trips Out'] = {
        number: parseFloat(tripsOut)
      };
    }

    // Add fuel reading
    if (fuelReading !== undefined && fuelReading !== null && fuelReading !== '') {
      properties['Fuel Reading'] = {
        number: parseFloat(fuelReading)
      };
    }

    // Add issues/notes
    if (issues && issues !== 'N/A') {
      properties['Issues'] = {
        rich_text: [
          {
            text: {
              content: issues
            }
          }
        ]
      };
    }

    // Add driver statuses as a formatted string
    if (drivers && drivers.length > 0) {
      const driverSummary = drivers.map(d => {
        const status = d.fullDay ? 'Full Day' : d.halfDay ? 'Half Day' : '';
        return `${d.name}: ${status}`;
      }).join(', ');
      
      properties['Drivers'] = {
        rich_text: [
          {
            text: {
              content: driverSummary
            }
          }
        ]
      };
    }

    // Add prepared by
    if (preparedBy) {
      properties['Prepared By'] = {
        rich_text: [
          {
            text: {
              content: preparedBy
            }
          }
        ]
      };
    }

    // Add timestamp
    if (timestamp) {
      properties['Submitted At'] = {
        rich_text: [
          {
            text: {
              content: timestamp
            }
          }
        ]
      };
    }

    // Create page in Notion
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: {
          database_id: databaseId
        },
        properties: properties
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Notion API error:', JSON.stringify(data, null, 2));
      
      // Check for common errors
      if (data.code === 'validation_error') {
        return res.status(400).json({
          success: false,
          error: 'Database property mismatch',
          details: data.message,
          hint: 'Check that Notion database has correct property names and types'
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to create entry in Notion',
        details: data.message || 'Unknown error'
      });
    }

    // Success!
    return res.status(200).json({
      success: true,
      message: 'Daily report submitted successfully',
      pageId: data.id
    });

  } catch (error) {
    console.error('Daily report API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
