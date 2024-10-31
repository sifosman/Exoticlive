import { NextApiRequest, NextApiResponse } from 'next';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
const url = process.env.WORDPRESS_URL || '';
const consumerKey = process.env.WC_CONSUMER_KEY || '';
const consumerSecret = process.env.WC_CONSUMER_SECRET || '';

const api = new WooCommerceRestApi({
  url,
  consumerKey,
  consumerSecret,
  version: 'wc/v3'
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { line_items, ...orderData } = req.body;
      const response = await api.post('orders', { ...orderData, line_items });
      res.status(200).json(response.data);
    } catch (error) {
      res.status(500).json({ error: 'Error creating order' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
