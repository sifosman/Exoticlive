// Script to fetch stock information from the API
const http = require('http');

// Fetch data from the API endpoint
http.get('http://localhost:3000/api/check-stock', (res) => {
  let data = '';

  // A chunk of data has been received
  res.on('data', (chunk) => {
    data += chunk;
  });

  // The whole response has been received
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(data);
      console.log(JSON.stringify(parsedData, null, 2));
    } catch (e) {
      console.error('Error parsing JSON response:', e);
      console.log('Raw response:', data);
    }
  });
}).on('error', (err) => {
  console.error('Error fetching data:', err.message);
});
