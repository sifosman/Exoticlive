# Ozow Payment Integration Debug Information

## Issue Description
We're experiencing a "HashCheck value has failed" error when attempting to process payments through Ozow. We've followed the documentation but are still encountering this issue.

## Implementation Details

### Environment
- Website: Exotic Shoes (exoticshoes.co.za)
- Environment: Production
- Integration Type: Direct Form Post to pay.ozow.com

### Parameters Being Sent to Ozow
We're sending the following parameters to Ozow in this exact order:

1. `SiteCode`: [YOUR_SITE_CODE] (from environment variables)
2. `CountryCode`: ZA
3. `CurrencyCode`: ZAR
4. `Amount`: [DYNAMIC_AMOUNT] (e.g., 1500.00)
5. `TransactionReference`: [DYNAMIC_REFERENCE] (e.g., ozow-1234567890)
6. `BankReference`: [DYNAMIC_REFERENCE] (same as TransactionReference)
7. `CancelUrl`: https://exoticshoes.co.za/checkout?status=cancelled&ref=[REFERENCE]
8. `ErrorUrl`: https://exoticshoes.co.za/checkout?status=error&ref=[REFERENCE]
9. `SuccessUrl`: https://exoticshoes.co.za/order-success?ref=[REFERENCE]&method=ozow
10. `NotifyUrl`: https://exoticshoes.co.za/api/ozow-notification?ref=[REFERENCE]
11. `IsTest`: false
12. `HashCheck`: [CALCULATED_HASH]

Optional parameters (not included in hash calculation):
- `optional1`: [CUSTOMER_NAME]
- `optional2`: [CUSTOMER_EMAIL]

### Hash Calculation Process
We're calculating the hash exactly as described in the documentation:

1. Concatenate all required parameters in the exact order listed above (without the parameter names, just the values)
2. Append the private key to the end of the concatenated string
3. Convert the entire string to lowercase
4. Generate a SHA512 hash of the lowercase string

Example hash input (with redacted private key):
```
[SITE_CODE]ZAZAR1500.00ozow-1234567890ozow-1234567890https://exoticshoes.co.za/checkout?status=cancelled&ref=ozow-1234567890https://exoticshoes.co.za/checkout?status=error&ref=ozow-1234567890https://exoticshoes.co.za/order-success?ref=ozow-1234567890&method=ozowhttps://exoticshoes.co.za/api/ozow-notification?ref=ozow-1234567890false[PRIVATE_KEY]
```

### Code Implementation
Here's our TypeScript implementation for the hash calculation:

```typescript
// Concatenate parameters in the exact order required by Ozow
const hashInput =
  siteCode +             // SiteCode
  'ZA' +                 // CountryCode
  'ZAR' +                // CurrencyCode
  amountFormatted +      // Amount
  reference +            // TransactionReference
  bankReference +        // BankReference
  cancelUrl +            // CancelUrl
  errorUrl +             // ErrorUrl
  successUrl +           // SuccessUrl
  notifyUrl +            // NotifyUrl
  isTestValue +          // IsTest
  privateKey;            // PrivateKey

// Convert to lowercase as per Ozow documentation
const lowercaseHashInput = hashInput.toLowerCase();

// Generate SHA512 hash
const hash = crypto
  .createHash('sha512')
  .update(lowercaseHashInput, 'utf8')
  .digest('hex').toLowerCase();
```

### URL Construction
We're constructing the URL with parameters in the exact same order as used for the hash calculation, and we're not URL-encoding the parameter names (only the values):

```
https://pay.ozow.com/?SiteCode=[SITE_CODE]&CountryCode=ZA&CurrencyCode=ZAR&Amount=1500.00&TransactionReference=ozow-1234567890&BankReference=ozow-1234567890&CancelUrl=https%3A%2F%2Fexoticshoes.co.za%2Fcheckout%3Fstatus%3Dcancelled%26ref%3Dozow-1234567890&ErrorUrl=https%3A%2F%2Fexoticshoes.co.za%2Fcheckout%3Fstatus%3Derror%26ref%3Dozow-1234567890&SuccessUrl=https%3A%2F%2Fexoticshoes.co.za%2Forder-success%3Fref%3Dozow-1234567890%26method%3Dozow&NotifyUrl=https%3A%2F%2Fexoticshoes.co.za%2Fapi%2Fozow-notification%3Fref%3Dozow-1234567890&IsTest=false&HashCheck=[CALCULATED_HASH]&optional1=John%20Doe&optional2=john.doe%40example.com
```

## Questions for Ozow Support

1. Is our hash calculation process correct? Are we missing any steps or using incorrect parameters?
2. Should the hash be lowercase or uppercase when sent to Ozow?
3. Are there any special requirements for URL encoding in the hash calculation?
4. Could there be an issue with our site code or private key configuration?
5. Are there any common issues or edge cases that could cause the "HashCheck value has failed" error?
6. Is there a test endpoint or sandbox we can use to validate our integration?

## Additional Information

We've verified that:
- The site code and private key match what's in our Ozow merchant account
- The hash is exactly 128 characters long (512 bits)
- We're not including optional parameters in the hash calculation
- We're using the correct parameter names and order as specified in the documentation

Any assistance you can provide would be greatly appreciated.

Contact Information:
- Name: [YOUR_NAME]
- Email: [YOUR_EMAIL]
- Phone: [YOUR_PHONE]
