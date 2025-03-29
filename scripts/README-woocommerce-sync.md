# WooCommerce to Typesense Sync

This script performs a complete synchronization of WooCommerce product data to Typesense, ensuring accurate attributes, variations, and stock quantities.

## Requirements

Before running the script, make sure your `.env` file contains the following variables:

```
# Existing Typesense variables (should already be set)
NEXT_PUBLIC_TYPESENSE_HOST=your-typesense-host
NEXT_PUBLIC_TYPESENSE_PORT=your-typesense-port
NEXT_PUBLIC_TYPESENSE_PROTOCOL=https
NEXT_PUBLIC_TYPESENSE_ADMIN_API_KEY=your-typesense-api-key

# WooCommerce API credentials (need to be added)
NEXT_PUBLIC_WORDPRESS_URL=https://your-wordpress-site.com
WC_CONSUMER_KEY=your-woocommerce-consumer-key
WC_CONSUMER_SECRET=your-woocommerce-consumer-secret
```

To get your WooCommerce API keys:

1. Go to WooCommerce → Settings → Advanced → REST API
2. Click "Add key"
3. Description: "Typesense Sync"
4. User: Select an admin user
5. Permissions: Read (if you only want to sync data) or Read/Write (if you need to update WooCommerce)
6. Generate API key
7. Copy the Consumer Key and Consumer Secret to your `.env` file

## Customization

In the script, you can adjust these settings:

- `BATCH_SIZE`: Number of products to process at once (default: 10)
- `CLEAR_TYPESENSE`: Whether to clear and recreate the Typesense collection (default: false)

Setting `CLEAR_TYPESENSE` to `true` will completely reset your Typesense data. Use this option when you want to perform a full re-sync.

## Running the Script

```bash
node scripts/complete-woocommerce-sync.mjs
```

The script will:

1. Fetch all products from WooCommerce
2. For variable products, fetch all variations
3. Transform product data to the proper format for Typesense
4. Index products in Typesense with all attributes, variations, and stock data

A log file will be created at `./woocommerce-sync.log` with detailed information about the sync process.
