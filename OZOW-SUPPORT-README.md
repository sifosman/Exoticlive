# Ozow Integration Support Request

## Files Included

1. `ozow-debug-info.md` - Detailed information about our implementation and the issue we're facing
2. `ozow-sample-payload.txt` - A sample payload with the parameters we're sending to Ozow
3. `ozow-hash-test.js` - A test script that demonstrates our hash calculation process

## Steps to Reproduce the Issue

1. We're attempting to process a payment through Ozow using the direct form post method
2. We're calculating the hash as described in the documentation
3. We're sending all required parameters to pay.ozow.com
4. We're receiving a "The HashCheck value has failed" error

## What We've Tried

1. Using both lowercase and uppercase hash values
2. Double-checking the site code and private key
3. Ensuring parameters are in the exact order specified in the documentation
4. Not including optional parameters in the hash calculation
5. Verifying the hash is exactly 128 characters long (512 bits)

## Request for Assistance

Please review our implementation and let us know if there are any issues with:

1. Our hash calculation process
2. The order of parameters
3. URL encoding of parameters
4. Any other potential issues that could cause the hash check to fail

## Contact Information

- Name: [YOUR_NAME]
- Email: [YOUR_EMAIL]
- Phone: [YOUR_PHONE]
- Website: exoticshoes.co.za

Thank you for your assistance!
