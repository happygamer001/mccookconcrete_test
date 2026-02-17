// Simple test endpoint to verify Vercel serverless functions work
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({ 
    success: true, 
    message: '🎉 API endpoint is working!',
    timestamp: new Date().toISOString(),
    environment: {
      hasNotionKey: !!process.env.NOTION_API_KEY,
      hasMileageDb: !!process.env.NOTION_MILEAGE_DB_ID,
      hasFuelDb: !!process.env.NOTION_FUEL_DB_ID
    }
  });
};
