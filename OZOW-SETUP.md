# Ozow Payment Integration Setup Guide

## Overview
This guide explains how to fix the "HashCheck value has failed" error and properly configure the Ozow payment integration.

## Common Causes of "HashCheck value has failed" Error

1. **Missing Environment Variables** - The most common cause
2. **Incorrect Private Key** - Wrong or corrupted private key
3. **Environment Variable Mismatch** - Different values between frontend and backend
4. **Test Mode Inconsistency** - Mismatched test mode settings
5. **URL Encoding Issues** - Problems with callback URLs

## Required Environment Variables

### In Vercel (or your deployment platform):
You need to configure these environment variables:

```bash
# Backend variables (server-side only)
OZOW_SITE_CODE=your_site_code_here
OZOW_PRIVATE_KEY=your_private_key_here
OZOW_API_KEY=your_api_key_here
OZOW_IS_TEST=false

# Frontend variables (client-side safe)
NEXT_PUBLIC_OZOW_SITE_CODE=your_site_code_here
NEXT_PUBLIC_OZOW_TEST_MODE=false
```

### For Local Development:
Create a `.env.local` file in your project root with:

```bash
# Copy from env.template and fill in your values
OZOW_SITE_CODE=your_site_code_here
OZOW_PRIVATE_KEY=your_private_key_here
OZOW_API_KEY=your_api_key_here
OZOW_IS_TEST=false
NEXT_PUBLIC_OZOW_SITE_CODE=your_site_code_here
NEXT_PUBLIC_OZOW_TEST_MODE=false
```

## Getting Your Ozow Credentials

1. Log in to your [Ozow Merchant Portal](https://merchant.ozow.com)
2. Navigate to **Settings** > **Site Management**
3. Copy your:
   - **Site Code** (e.g., "ABC123")
   - **Private Key** (long alphanumeric string)
   - **API Key** (if using API integration)

## Important Configuration Notes

⚠️ **CRITICAL**: 
- **Site Code** must be the same in both `OZOW_SITE_CODE` and `NEXT_PUBLIC_OZOW_SITE_CODE`
- **Test Mode** must be consistent: `OZOW_IS_TEST` and `NEXT_PUBLIC_OZOW_TEST_MODE` should have the same value
- **Private Key** should never be exposed client-side (no NEXT_PUBLIC_ prefix)

## Troubleshooting Steps

### 1. Verify Environment Variables
Check that all required environment variables are set in Vercel:

```bash
# Required backend variables
OZOW_SITE_CODE=ABC123
OZOW_PRIVATE_KEY=your_actual_private_key
OZOW_API_KEY=your_actual_api_key
OZOW_IS_TEST=false

# Required frontend variables
NEXT_PUBLIC_OZOW_SITE_CODE=ABC123
NEXT_PUBLIC_OZOW_TEST_MODE=false
```

### 2. Check Test Mode Consistency
Ensure both backend and frontend use the same test mode:
- For **Production**: `OZOW_IS_TEST=false` and `NEXT_PUBLIC_OZOW_TEST_MODE=false`
- For **Testing**: `OZOW_IS_TEST=true` and `NEXT_PUBLIC_OZOW_TEST_MODE=true`

### 3. Validate Private Key
- Ensure the private key is copied correctly (no extra spaces or characters)
- The private key should be a long alphanumeric string
- Test with a fresh copy from the Ozow portal

### 4. Check Site Code
- Site code should match exactly what's in your Ozow merchant portal
- Case-sensitive (usually uppercase letters and numbers)
- No extra spaces or characters

### 5. Verify URLs
Ensure your callback URLs are accessible:
- **Success URL**: `https://yourdomain.com/order-success?ref=REF&method=ozow`
- **Cancel URL**: `https://yourdomain.com/checkout?status=cancelled&ref=REF`
- **Error URL**: `https://yourdomain.com/checkout?status=error&ref=REF`
- **Notify URL**: `https://yourdomain.com/api/ozow-notification?ref=REF`

## Testing the Integration

### 1. Check Server Logs
Look for these log messages in your Vercel function logs:
```
===== OZOW CREDENTIALS CHECK =====
Site Code: ABC123
Private Key exists: true Length: 64
API Key exists: true Length: 32
```

### 2. Test Payment Flow
1. Go to checkout page
2. Select Ozow payment method
3. Click "Complete Purchase"
4. Check browser console for any errors
5. Verify you're redirected to Ozow (not the error page)

### 3. Common Error Messages
- **"Payment service not configured"**: Missing environment variables
- **"HashCheck value has failed"**: Usually incorrect private key or test mode mismatch
- **"Invalid site code"**: Wrong site code or not configured

## Hash Calculation Details

The hash is calculated using this exact order:
1. SiteCode
2. CountryCode (ZA)
3. CurrencyCode (ZAR)
4. Amount
5. TransactionReference
6. BankReference
7. CancelUrl
8. ErrorUrl
9. SuccessUrl
10. NotifyUrl
11. IsTest
12. PrivateKey

The string is then converted to lowercase and hashed using SHA512.

## Environment Variable Checklist

Before deploying, ensure you have:

- [ ] `OZOW_SITE_CODE` set in Vercel
- [ ] `OZOW_PRIVATE_KEY` set in Vercel (correct private key from Ozow portal)
- [ ] `OZOW_API_KEY` set in Vercel
- [ ] `OZOW_IS_TEST` set to "false" for production
- [ ] `NEXT_PUBLIC_OZOW_SITE_CODE` set in Vercel (same as OZOW_SITE_CODE)
- [ ] `NEXT_PUBLIC_OZOW_TEST_MODE` set to "false" for production
- [ ] All values copied exactly from Ozow merchant portal
- [ ] No extra spaces or characters in any values
- [ ] Test mode values are consistent between backend and frontend

## Next Steps

1. **Update Vercel Environment Variables** with the correct Ozow credentials
2. **Deploy your changes** to apply the new environment variables
3. **Test the payment flow** thoroughly
4. **Monitor logs** for any remaining issues

## Support

If you continue to experience issues:
1. Check the server logs for detailed error messages
2. Verify all environment variables are correctly set
3. Test with Ozow's test credentials first
4. Contact Ozow support with your site code and error details
