import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Helper function to validate payment data
function validatePaymentData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for required fields
  if (!data.siteCode && !process.env.OZOW_SITE_CODE) errors.push('Missing SiteCode');
  if (!data.amount || isNaN(parseFloat(data.amount))) errors.push('Invalid or missing Amount');
  if (!data.transactionReference) errors.push('Missing TransactionReference');
  if (!data.cancelUrl) errors.push('Missing CancelUrl');
  if (!data.errorUrl) errors.push('Missing ErrorUrl');
  if (!data.successUrl) errors.push('Missing SuccessUrl');
  if (!data.notifyUrl) errors.push('Missing NotifyUrl');

  // Additional validations
  if (data.amount && parseFloat(data.amount) <= 0) errors.push('Amount must be greater than 0');

  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log('Ozow Payment Request Received:', JSON.stringify(body, null, 2));

    // Validate the payment data first
    const validation = validatePaymentData(body);
    if (!validation.isValid) {
      console.error('Payment data validation failed:', validation.errors);
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid payment data: ' + validation.errors.join(', ')
        },
        { status: 400 }
      );
    }

    // Extract only the payment details we need from request body
    const {
      siteCode,
      amount,
      transactionReference,
      customer,
      optional1,
      optional2,
      cancelUrl,
      errorUrl,
      successUrl,
      notifyUrl
    } = body;

    // Ensure required environment variables are set
    // Use ONLY environment variable or body value, not both
    const siteCodeToUse = process.env.OZOW_SITE_CODE || siteCode;


    const privateKey = process.env.OZOW_PRIVATE_KEY;
    const apiKey = process.env.OZOW_API_KEY;

    console.log('===== OZOW CREDENTIALS CHECK =====');
    console.log('Site Code:', siteCodeToUse);
    console.log('Private Key exists:', !!privateKey, 'Length:', privateKey ? privateKey.length : 0);
    console.log('API Key exists:', !!apiKey, 'Length:', apiKey ? apiKey.length : 0);

    // Check if there's an environment variable for isTest
    const envIsTest = process.env.OZOW_IS_TEST;
    console.log('OZOW_IS_TEST environment variable:', envIsTest || '(not set)');

    // Always use "false" string for production mode
    const isTestString = envIsTest || 'false';

    // Make sure we're using the same value in both places
    const isTestValue = isTestString;

    console.log('Using isTestValue:', isTestValue);

    if (!privateKey || !siteCodeToUse || !apiKey) {
      const missingVars = [];
      if (!siteCodeToUse) missingVars.push('OZOW_SITE_CODE');
      if (!privateKey) missingVars.push('OZOW_PRIVATE_KEY');
      if (!apiKey) missingVars.push('OZOW_API_KEY');
      
      console.error('Missing Ozow configuration:', {
        hasSiteCode: !!siteCodeToUse,
        hasPrivateKey: !!privateKey,
        hasApiKey: !!apiKey,
        missingVariables: missingVars
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: `Ozow configuration missing. Please set these environment variables in Vercel: ${missingVars.join(', ')}`,
          missingVariables: missingVars
        },
        { status: 500 }
      );
    }

    // Format values for proper request
    const amountFormatted = parseFloat(amount).toFixed(2);
    const reference = transactionReference.trim();
    const bankReference = reference;
    const customerName = customer.firstName && customer.lastName ?
      `${customer.firstName.trim()} ${customer.lastName.trim()}` : '';
    // Store customer email as customerEmail for later use
    const customerEmail = customer.email || '';

    console.log('===== PAYMENT DETAILS =====');
    console.log('Amount:', amountFormatted);
    console.log('Reference:', reference);
    console.log('Customer:', customerName);
    console.log('Customer Email:', customerEmail);
    console.log('Success URL:', successUrl);
    console.log('Notify URL:', notifyUrl);

    // Use standard Ozow URL for production
    const baseUrl = 'https://pay.ozow.com';

    // Construct the Ozow redirect URL with all required parameters
    const params = new URLSearchParams();

    // Required parameters in the exact order Ozow expects for hash calculation
    // This order MUST match the C# example in the documentation
    // IMPORTANT: Do not URL encode these values for the hash calculation
    params.append('SiteCode', siteCodeToUse);
    params.append('CountryCode', 'ZA');
    params.append('CurrencyCode', 'ZAR');
    params.append('Amount', amountFormatted);
    params.append('TransactionReference', reference);
    params.append('BankReference', bankReference);
    params.append('CancelUrl', cancelUrl);
    params.append('ErrorUrl', errorUrl);
    params.append('SuccessUrl', successUrl);
    params.append('NotifyUrl', notifyUrl);
    params.append('IsTest', isTestValue);

    // Optional parameters - these come AFTER the required parameters
    // and are NOT included in the hash calculation
    if (customerName) {
      params.append('optional1', customerName); // Using optional1 for customer name
    }

    if (customerEmail) {
      params.append('optional2', customerEmail); // Using optional2 for customer email
    }

    console.log('===== HASH CALCULATION =====');

    // Extract all parameters for hash calculation
    const paramsObj: Record<string, string> = {};
    params.forEach((value, key) => {
      paramsObj[key] = value;
    });

    // NOTE: We should NOT sort parameters alphabetically for Ozow
    // The hash must be calculated with parameters in the exact order specified in the documentation
    // This was causing the hashcheck error

    // Build hash input according to Ozow documentation example
    // Following the exact example from their documentation
    console.log('\n===== IMPLEMENTING EXACT OZOW EXAMPLE =====');

    // Step 1: Create the input string exactly as in their C# example
    // Example from docs: string inputString = string.Concat(siteCode, countryCode, currencyCode, amount, transactionReference, bankReference, cancelUrl, errorUrl, successUrl, notifyUrl, isTest, privateKey);
    // IMPORTANT: The order of parameters must match EXACTLY what's in the Ozow documentation C# example
    // The parameters must be in this exact order: SiteCode, CountryCode, CurrencyCode, Amount, TransactionReference, BankReference, CancelUrl, ErrorUrl, SuccessUrl, NotifyUrl, IsTest, PrivateKey
    const hashInput =
      siteCodeToUse +          // SiteCode
      'ZA' +                   // CountryCode
      'ZAR' +                  // CurrencyCode
      amountFormatted +        // Amount
      reference +              // TransactionReference
      bankReference +          // BankReference
      cancelUrl +              // CancelUrl
      errorUrl +               // ErrorUrl
      successUrl +             // SuccessUrl
      notifyUrl +              // NotifyUrl
      isTestValue +           // IsTest
      privateKey;              // PrivateKey

    // IMPORTANT: Do NOT include optional1 (customer email) in the hash calculation
    // This is a common mistake that causes hash check errors

    console.log('Raw hash input (with redacted private key):', hashInput.replace(privateKey, '[REDACTED]'));

    // Convert to lowercase as per Ozow documentation
    const lowercaseHashInput = hashInput.toLowerCase();

    console.log('Hash calculation method:');
    console.log('1. Concatenate values in the exact order required by Ozow (without separators or key names)');
    console.log('2. Only include: SiteCode, CountryCode, CurrencyCode, Amount, TransactionReference, BankReference, CancelUrl, ErrorUrl, SuccessUrl, NotifyUrl, IsTest, PrivateKey');
    console.log('3. Convert the entire string to lowercase');
    console.log('4. Calculate SHA512 hash of the resulting string');
    console.log('Note: Following the exact C# example from Ozow documentation');
    console.log('Note: CustomerInformation and optional1 are NOT included in the hash calculation');

    // Log detailed parameter information
    console.log('Parameters being sent to Ozow:', JSON.stringify(paramsObj, null, 2));
    console.log('Private key length:', privateKey.length);

    // Log the values used in hash calculation in the exact order
    console.log('Values used in hash calculation (in order):');
    console.log('1. SiteCode:', siteCodeToUse);
    console.log('2. CountryCode: ZA');
    console.log('3. CurrencyCode: ZAR');
    console.log('4. Amount:', amountFormatted);
    console.log('5. TransactionReference:', reference);
    console.log('6. BankReference:', bankReference);
    console.log('7. CancelUrl:', cancelUrl);
    console.log('8. ErrorUrl:', errorUrl);
    console.log('9. SuccessUrl:', successUrl);
    console.log('10. NotifyUrl:', notifyUrl);
    console.log('11. IsTest:', isTestValue);
    console.log('12. PrivateKey: [REDACTED]');

    // Log redacted hash input for debugging
    const redactedHashInput = hashInput.replace(privateKey, '[REDACTED]');
    console.log('Redacted hash input:', redactedHashInput);
    console.log('Lowercase hash input (redacted):', lowercaseHashInput.replace(privateKey.toLowerCase(), '[REDACTED]'));
    console.log('Full hash input length:', hashInput.length);

    // Check for any 'true' string in the hash input
    console.log('Hash input contains "true" string:', hashInput.includes('true'));
    if (hashInput.includes('true')) {
      console.log('WARNING: Hash input contains "true" but isTestValue is set to:', isTestValue);
      console.log('This might cause hash verification to fail!');

      // Try to find where 'true' appears in the hash input
      const trueIndex = hashInput.indexOf('true');
      if (trueIndex >= 0) {
        const context = hashInput.substring(Math.max(0, trueIndex - 20), Math.min(hashInput.length, trueIndex + 24));
        console.log('Context around "true":', context.replace(privateKey, '[REDACTED]'));
      }
    }

    // Debug URL encoding issues
    console.log('\n===== URL ENCODING CHECK =====');
    console.log('CancelUrl raw:', cancelUrl);
    console.log('CancelUrl encoded:', encodeURIComponent(cancelUrl));
    console.log('ErrorUrl raw:', errorUrl);
    console.log('ErrorUrl encoded:', encodeURIComponent(errorUrl));
    console.log('SuccessUrl raw:', successUrl);
    console.log('SuccessUrl encoded:', encodeURIComponent(successUrl));
    console.log('NotifyUrl raw:', notifyUrl);
    console.log('NotifyUrl encoded:', encodeURIComponent(notifyUrl));

    // Verify the hash input format
    console.log('\n===== HASH INPUT VERIFICATION =====');
    console.log('Hash input starts with site code:', hashInput.startsWith(siteCodeToUse));
    console.log('Hash input contains amount:', hashInput.includes(amountFormatted));
    console.log('Hash input contains transaction reference:', hashInput.includes(reference));
    console.log('Hash input contains bank reference:', hashInput.includes(bankReference));
    console.log('Hash input contains cancel URL:', hashInput.includes(cancelUrl));
    console.log('Hash input contains error URL:', hashInput.includes(errorUrl));
    console.log('Hash input contains success URL:', hashInput.includes(successUrl));
    console.log('Hash input contains notify URL:', hashInput.includes(notifyUrl));
    console.log('Hash input contains isTest:', hashInput.includes(isTestValue));
    console.log('Hash input ends with private key:', hashInput.endsWith(privateKey));

    // Generate SHA512 hash as required by Ozow
    // Default to LOWERCASE per Ozow docs; allow overriding to UPPERCASE via env flag
    const rawHash = crypto
      .createHash('sha512')
      .update(lowercaseHashInput, 'utf8')
      .digest('hex');

    const useUppercaseHash = (process.env.OZOW_HASH_UPPERCASE || '').toLowerCase() === 'true';
    const hash = useUppercaseHash ? rawHash.toUpperCase() : rawHash.toLowerCase();

    // Verify the hash is 128 characters long (512 bits = 128 hex characters)
    console.log('Hash length is correct (128 chars):', hash.length === 128);
    console.log('Hash:', hash);
    console.log('Using uppercase HashCheck:', useUppercaseHash);

    // Add hash to parameters
    // IMPORTANT: HashCheck casing controlled by OZOW_HASH_UPPERCASE (default lowercase)
    params.append('HashCheck', hash);

    // Log the final parameters
    console.log('\n===== FINAL PARAMETERS =====');
    const finalParams: Record<string, string> = {};
    params.forEach((value, key) => {
      if (key !== 'HashCheck') {
        finalParams[key] = value;
      } else {
        finalParams[key] = '[HASH REDACTED]';
      }
    });
    console.log('Parameters being sent to Ozow:', JSON.stringify(finalParams, null, 2));

    // Prefer the official Ozow API to generate a payment URL to avoid any encoding/order ambiguities
    console.log('\n===== CALLING OZOW API: PostPaymentRequest =====');
    const apiPayload: Record<string, any> = {
      siteCode: siteCodeToUse,
      countryCode: 'ZA',
      currencyCode: 'ZAR',
      amount: amountFormatted,
      transactionReference: reference,
      bankReference,
      cancelUrl,
      errorUrl,
      successUrl,
      notifyUrl,
      isTest: isTestValue === 'true',
      hashCheck: hash
    };
    if (customerName) apiPayload.optional1 = customerName;
    if (customerEmail) apiPayload.optional2 = customerEmail;

    console.log('Ozow API payload (sanitized):', JSON.stringify({ ...apiPayload, hashCheck: '[HASH REDACTED]' }, null, 2));

    const apiResp = await fetch('https://api.ozow.com/postpaymentrequest', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ApiKey: apiKey!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiPayload)
    });

    const apiJson = await apiResp.json().catch(() => ({} as any));
    console.log('Ozow API response:', apiJson);

    if (!apiResp.ok || apiJson?.errorMessage) {
      console.error('Ozow API error:', { status: apiResp.status, errorMessage: apiJson?.errorMessage });
      return NextResponse.json(
        {
          success: false,
          message: `Ozow payment request failed: ${apiJson?.errorMessage || 'HTTP ' + apiResp.status}`,
          details: apiJson
        },
        { status: 502 }
      );
    }

    const paymentUrl = apiJson.url as string;
    const paymentRequestId = apiJson.paymentRequestId as string;
    console.log('===== RECEIVED PAYMENT URL FROM API =====');
    console.log(paymentUrl);

    // Return the payment URL to the client
    return NextResponse.json({
      success: true,
      paymentUrl,
      paymentRequestId,
      payload: {
        parameters: paramsObj,
        hashInput: redactedHashInput
      }
    });
  } catch (error) {
    console.error('Error processing Ozow payment:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred processing the payment',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
