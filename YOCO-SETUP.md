# Yoco Payment Integration Setup Guide

## Overview
This guide explains how to properly configure the Yoco payment integration for your application.

## Issues Fixed
1. **Security Vulnerability**: Removed hardcoded credentials and fixed environment variable exposure
2. **Missing Environment Variables**: Added proper environment variable configuration
3. **API Route Issues**: Fixed server-side secret key usage and improved error handling
4. **Configuration Problems**: Added validation and better error messages

## Required Environment Variables

### In Vercel (or your deployment platform):
You need to configure these environment variables:

```bash
# Server-side secret key (NEVER expose this to client)
YOCO_SECRET_KEY=sk_live_your_actual_secret_key_here

# Client-side public key (safe to expose)
NEXT_PUBLIC_YOCO_PUBLIC_KEY=pk_live_your_actual_public_key_here
```

### For Local Development:
Create a `.env.local` file in your project root with:

```bash
# Copy from env.template and fill in your values
YOCO_SECRET_KEY=sk_live_your_actual_secret_key_here
NEXT_PUBLIC_YOCO_PUBLIC_KEY=pk_live_your_actual_public_key_here
```

## Getting Your Yoco Keys

1. Log in to your [Yoco Portal](https://portal.yoco.com)
2. Navigate to **Settings** > **API Keys**
3. Copy your:
   - **Secret Key** (starts with `sk_live_` or `sk_test_`)
   - **Public Key** (starts with `pk_live_` or `pk_test_`)

## Important Security Notes

⚠️ **CRITICAL**: 
- **NEVER** use `NEXT_PUBLIC_` prefix for secret keys
- Secret keys should only be used server-side
- Public keys are safe to expose client-side

## What Was Changed

### 1. API Route (`/app/api/Payment/route.ts`)
- Fixed environment variable from `NEXT_PUBLIC_YOCO_SECRET_KEY` to `YOCO_SECRET_KEY`
- Added proper validation for missing environment variables
- Improved error handling and logging
- Added parameter validation

### 2. Checkout Page (`/app/checkout/page.tsx`)
- Replaced hardcoded public key with environment variable
- Added validation for missing public key
- Better error messages for users

### 3. Environment Template (`env.template`)
- Added Yoco environment variables with proper documentation
- Included security warnings about secret key usage

## Testing the Integration

1. **Check Environment Variables**:
   ```bash
   # In your deployment platform, verify:
   YOCO_SECRET_KEY=sk_live_... (without NEXT_PUBLIC_)
   NEXT_PUBLIC_YOCO_PUBLIC_KEY=pk_live_...
   ```

2. **Test Payment Flow**:
   - Go to checkout page
   - Select Yoco payment method
   - Verify the payment popup appears
   - Check browser console for any errors

3. **Check Server Logs**:
   - Look for "Processing Yoco payment" messages
   - Verify no "Payment service not configured" errors

## Troubleshooting

### Error: "Payment service not configured"
- Check that `YOCO_SECRET_KEY` is set (without NEXT_PUBLIC_ prefix)
- Verify the key starts with `sk_live_` or `sk_test_`

### Error: "Cannot find name 'process'"
- This is a TypeScript configuration issue, not a runtime error
- The code will still work in production

### Payment popup doesn't appear
- Check that `NEXT_PUBLIC_YOCO_PUBLIC_KEY` is set correctly
- Verify the key starts with `pk_live_` or `pk_test_`
- Check browser console for JavaScript errors

### API calls failing
- Verify `YOCO_SECRET_KEY` is correct and has proper permissions
- Check server logs for detailed error messages
- Ensure you're using live keys for production, test keys for development

## Next Steps

1. **Update Vercel Environment Variables**:
   - Remove: `NEXT_PUBLIC_YOCO_SECRET_KEY`
   - Add: `YOCO_SECRET_KEY` and `NEXT_PUBLIC_YOCO_PUBLIC_KEY`

2. **Deploy and Test**:
   - Deploy your changes
   - Test the payment flow thoroughly
   - Monitor logs for any issues

3. **Security Review**:
   - Ensure no secret keys are exposed in client-side code
   - Verify environment variables are properly configured
   - Test with both test and live keys

## Support

If you encounter issues:
1. Check the server logs for detailed error messages
2. Verify all environment variables are correctly set
3. Test with Yoco's test keys first before using live keys
4. Contact Yoco support if API-related issues persist
