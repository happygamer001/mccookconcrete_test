module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const notionApiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_MILEAGE_DB_ID;

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Notion-Version': '2022-06-28'
      }
    });

    const data = await response.json();
    
    // Return just the property names
    const properties = Object.keys(data.properties || {});
    
    return res.status(200).json({ 
      properties: properties,
      fullSchema: data.properties 
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
