import { NextApiRequest, NextApiResponse } from 'next';
import { syncProducts } from '@/lib/sync/woocommerce';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify the request is from a trusted source (e.g., Vercel Cron)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await syncProducts(true);
    res.status(200).json({ message: 'Sync completed successfully' });
  } catch (error) {
    console.error('Sync failed:', error);
    res.status(500).json({ message: 'Sync failed' });
  }
}
