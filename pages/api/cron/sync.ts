import { NextApiRequest, NextApiResponse } from 'next';
import { syncProducts } from '@/lib/sync/woocommerce';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Your sync logic here
    await syncProducts(true);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Cron sync failed:', error);
    return res.status(500).json({ error: 'Sync failed' });
  }
}