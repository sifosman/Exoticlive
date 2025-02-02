import { NextApiRequest, NextApiResponse } from 'next';
import { handleProductWebhook } from '@/lib/sync/woocommerce';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle GET requests for webhook verification
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'Webhook endpoint is live' });
  }

  // Only allow POST for actual webhook events
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify webhook signature
  const signature = req.headers['x-wc-webhook-signature'];
  if (!signature) {
    return res.status(401).json({ message: 'No signature provided' });
  }

  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WOOCOMMERCE_WEBHOOK_SECRET!)
    .update(payload)
    .digest('base64');

  if (signature !== expectedSignature) {
    return res.status(401).json({ message: 'Invalid signature' });
  }

  try {
    const topic = req.headers['x-wc-webhook-topic'] as string;
    await handleProductWebhook(req.body, topic);
    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
}