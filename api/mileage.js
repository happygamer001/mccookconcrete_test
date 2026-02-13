const { Client } = require('@notionhq/client');

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { driver, truck, date, state, mileageStart, mileageEnd } = req.body;

    if (!driver || !truck || !date || !state || !mileageStart || !mileageEnd) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const response = await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_MILEAGE_DB_ID,
      },
      properties: {
        'Entry ID': {
          title: [{ text: { content: `${truck}-${date}-${Date.now()}` } }],
        },
        'Driver Name': {
          select: { name: driver === 'Other' ? 'Other' : driver },
        },
        'Custom Driver Name': {
          rich_text: [{ text: { content: driver } }],
        },
        'Truck Number': {
          select: { name: truck },
        },
        'Date': {
          date: { start: date },
        },
        'State': {
          select: { name: state },
        },
        'Mileage Start': {
          number: parseFloat(mileageStart),
        },
        'Mileage End': {
          number: parseFloat(mileageEnd),
        },
      },
    });

    console.log('Mileage entry created:', response.id);
    res.status(200).json({ success: true, id: response.id });
  } catch (error) {
    console.error('Error creating mileage entry:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create mileage entry' });
  }
};
