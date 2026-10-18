export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Pragma, Cache-Control');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const session = req.body;
  return res.status(200).json({
    success: true,
    session: session,
    message: 'Session synced successfully'
  });
}
