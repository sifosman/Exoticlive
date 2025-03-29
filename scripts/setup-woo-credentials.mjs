import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to the .env file
const envPath = path.resolve('.env');

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found in the project root.');
  rl.close();
  process.exit(1);
}

console.log('===================================================');
console.log('WooCommerce API Credentials Setup');
console.log('===================================================');
console.log('\nThis script will help you add WooCommerce API credentials to your .env file.');
console.log('\nTo generate these credentials:');
console.log('1. Log in to your WordPress admin panel');
console.log('2. Go to WooCommerce > Settings > Advanced > REST API');
console.log('3. Click "Add Key"');
console.log('4. Enter a description (e.g., "Typesense Sync")');
console.log('5. Set User to an administrator account');
console.log('6. Set Permissions to "Read/Write"');
console.log('7. Click "Generate API Key"');
console.log('8. Copy the Consumer Key and Consumer Secret');

// Ask for the consumer key and secret
rl.question('\nEnter your WooCommerce Consumer Key: ', (consumerKey) => {
  rl.question('Enter your WooCommerce Consumer Secret: ', (consumerSecret) => {
    // Read the current .env file
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check if the keys already exist
    const hasConsumerKey = envContent.includes('WOO_CONSUMER_KEY=');
    const hasConsumerSecret = envContent.includes('WOO_CONSUMER_SECRET=');
    
    // Update or add the keys
    if (hasConsumerKey) {
      envContent = envContent.replace(/WOO_CONSUMER_KEY=.*/g, `WOO_CONSUMER_KEY=${consumerKey}`);
    } else {
      envContent += `\nWOO_CONSUMER_KEY=${consumerKey}`;
    }
    
    if (hasConsumerSecret) {
      envContent = envContent.replace(/WOO_CONSUMER_SECRET=.*/g, `WOO_CONSUMER_SECRET=${consumerSecret}`);
    } else {
      envContent += `\nWOO_CONSUMER_SECRET=${consumerSecret}`;
    }
    
    // Write the updated content back to the .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ WooCommerce API credentials have been added to your .env file.');
    console.log('\nYou can now run the sync script:');
    console.log('node scripts/sync-woocommerce-variations.mjs');
    
    rl.close();
  });
});
