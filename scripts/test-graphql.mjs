import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const query = `
  query {
    product(id: "oxford-elastic-ankle-boots", idType: SLUG) {
      id
      name
      image {
        sourceUrl
        altText
      }
      galleryImages {
        nodes {
          sourceUrl
          altText
        }
      }
    }
  }
`;

async function testGraphQL() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_WORDPRESS_API_URL;
    console.log('Testing GraphQL endpoint:', apiUrl);
    console.log('Query:', query);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Response not OK:', text);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('GraphQL Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
    if (error.response) {
      console.error('Error response:', await error.response.text());
    }
  }
}

testGraphQL();
