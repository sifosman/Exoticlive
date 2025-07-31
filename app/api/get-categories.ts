import { NextApiRequest, NextApiResponse } from 'next';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import axios from 'axios';

const api = new WooCommerceRestApi({
  url: process.env.WORDPRESS_URL!,
  consumerKey: process.env.WC_CONSUMER_KEY!,
  consumerSecret: process.env.WC_CONSUMER_SECRET!,
  version: 'wc/v3'
});

console.log('WORDPRESS_URL:', process.env.WORDPRESS_URL);
console.log('WC_CONSUMER_KEY:', process.env.WC_CONSUMER_KEY);
console.log('WC_CONSUMER_SECRET:', process.env.WC_CONSUMER_SECRET);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Test direct API access
      const directResponse = await axios.get(`${process.env.WORDPRESS_URL}/wp-json/wc/v3/products/categories`, {
        auth: {
          username: process.env.WC_CONSUMER_KEY!,
          password: process.env.WC_CONSUMER_SECRET!
        }
      });
      res.status(200).json(directResponse.data);
    } catch (error: any) {
      console.error('Error in get-categories API route:', error.response?.data || error.message);
      res.status(500).json({ error: 'Error fetching categories', details: error.response?.data || error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
