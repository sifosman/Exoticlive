"use client";

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { useCart } from '@/lib/cartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Truck } from 'lucide-react';
import { Lato } from 'next/font/google';
import YocoLogo from '@/components/ui/YocoLogo';
import PageLoading from '@/components/ui/PageLoading';

declare global {
  interface Window {
    YocoSDK: any;
  }
}

// Add this style block at the top of your file, after the imports
const styles = {
  popupOverride: `
    .yoco-payment-overlay {
      z-index: 9999 !important;
    }
  `,
  fontFamily: {
    lato: 'var(--font-lato)'
  }
};

interface OrderLineItem {
  product_id: number | null;
  quantity: number;
  name?: string;
  total?: string;
  variation_id?: number;
}

const lato = Lato({ subsets: ['latin'], weight: ['400', '700'] });

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState('yoco'); // Default to Yoco payment
  const [paymentError, setPaymentError] = useState('');
  const [showBankingDetails, setShowBankingDetails] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);

  // State variables for shipping information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [province, setProvince] = useState('');

  useEffect(() => {
    setIsClient(true);

    // Set page as loaded after a short delay
    const timer = setTimeout(() => {
      setPageLoaded(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity || 0), 0);
  const shipping = 99; // Set shipping cost to R99
  const total = subtotal + shipping;

  const formatPrice = (price: number) => {
    return `R${price.toFixed(2)}`; // Format price with "R" symbol
  };

  // Function to safely decode product IDs that might be base64 encoded
  const safeDecodeId = (encodedId: string): string => {
    try {
      // Check if the string is actually base64 encoded
      // Base64 strings only contain A-Z, a-z, 0-9, +, /, and = for padding
      const isBase64 = /^[A-Za-z0-9+/=]+$/.test(encodedId);

      if (!isBase64) {
        console.log('ID is not base64 encoded, using as-is:', encodedId);
        return encodedId;
      }

      // Try to decode the base64 string
      const decoded = atob(encodedId);
      console.log('Converting ID:', encodedId, 'to:', decoded);
      return decoded;
    } catch (error) {
      // If decoding fails, log the error and return the original ID
      console.error('Error decoding ID:', error);
      return encodedId;
    }
  };

  const createWooCommerceOrder = async (paymentMethodTitle: string, transactionId?: string) => {
    console.log('Cart contents before creating order:', cart);
    try {
      // Create line items from cart
      const lineItems = cart.map(item => {
        // Get product ID, safely handling both encoded and non-encoded IDs
        let productId = item.id;
        try {
          // First check if it looks like a base64 string
          if (/^[A-Za-z0-9+/=]+$/.test(productId)) {
            const decodedId = safeDecodeId(productId);
            console.log('Converting ID:', productId, 'to:', decodedId);
            productId = decodedId;
          } else {
            console.log('Using raw product ID:', productId);
          }
        } catch (error) {
          console.error('Error processing product ID:', error);
          // Continue with the original ID if there's an error
        }

        // Extract attribute values for this item
        const attributes = [];
        if (item.attributes && item.attributes.length > 0) {
          item.attributes.forEach(attr => {
            attributes.push({
              key: attr.name,
              value: attr.value
            });
          });
        }

        // Return the line item object for the order
        return {
          product_id: productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: (item.price * item.quantity).toString(),
          meta_data: attributes
        };
      });

      // Prepare order payload
      const orderPayload = {
        payment_method: 'ozow',
        payment_method_title: paymentMethodTitle,
        set_paid: false,
        status: 'processing',
        billing: {
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
          address_1: address,
          city: city,
          state: province,
          postcode: postalCode,
          country: 'ZA'
        },
        shipping: {
          first_name: firstName,
          last_name: lastName,
          address_1: address,
          city: city,
          state: province,
          postcode: postalCode,
          country: 'ZA'
        },
        line_items: lineItems,
        shipping_lines: [
          {
            method_id: 'flat_rate',
            method_title: 'Flat Rate',
            total: '99'
          }
        ],
        meta_data: [
          {
            key: '_reduce_stock',
            value: 'yes'
          },
          {
            key: 'ozow_transaction_id',
            value: transactionId || ''
          }
        ]
      };

      console.log('Order payload:', JSON.stringify(orderPayload, null, 2));

      // Create order in WooCommerce
      const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL?.replace(/\/+$/, '') || 'https://wp.exoticshoes.co.za';

      console.log('Creating order at:', `${wpUrl}/wp-json/wc/v3/orders`);
      const response = await fetch(`${wpUrl}/wp-json/wc/v3/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('ck_266d630c64bfc03268cb471bdd86250b7a0b13f1:cs_d9da89b71742f6404027107dcc42b52926f7cb89')
        },
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WooCommerce API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const order = await response.json();
      console.log('Order created successfully:', order);

      // Note: WooCommerce will automatically reduce stock when we use the _reduce_stock meta field
      // We don't need to manually call the reduce-stock endpoint, which was causing a 404 error

      // Clear cart after successful order
      clearCart();

      return order;
    } catch (error) {
      console.error('Error creating WooCommerce order:', error);
      setPaymentError('Failed to create order. Please try again.');
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setPaymentError('');

    try {
      if (paymentMethod === 'yoco') {
        const yoco = new window.YocoSDK({
          publicKey: 'sk_live_9a8da319PKJ9r9Rd94e4ce7aa44d'
        });

        yoco.showPopup({
          amountInCents: Math.round(total * 100),
          currency: 'ZAR',
          name: 'Exotic Shoes',
          description: 'Order payment',
          callback: async function (result: any) {
            if (result.error) {
              setPaymentError(result.error.message);
              setIsLoading(false);
            } else {
              await handleYocoPayment(result);
            }
          }
        });
      } else if (paymentMethod === 'bank_transfer') {
        // Create order directly for bank transfer
        const order = await createWooCommerceOrder('Bank Transfer');
        setIsLoading(false);

        // Generate a reference for the order
        const orderRef = `bank-${order.id}-${Date.now()}`;

        // Save order data to localStorage
        const orderDataKey = `order_${orderRef}`;
        const orderData = {
          id: order.id,
          number: order.number,
          total: order.total,
          payment_method: 'bank_transfer',
          payment_method_title: 'Bank Transfer',
          billing: {
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            address_1: address,
            address_2: '',
            city: city,
            state: province,
            postcode: postalCode,
            country: 'ZA'
          },
          shipping: {
            first_name: firstName,
            last_name: lastName,
            address_1: address,
            city: city,
            state: province,
            postcode: postalCode,
            country: 'ZA'
          },
          line_items: order.line_items || [],
          status: order.status || 'processing',
          date_created: order.date_created || new Date().toISOString()
        };
        localStorage.setItem(orderDataKey, JSON.stringify(orderData));

        // Redirect to order success page
        window.location.href = `/order-success?ref=${orderRef}&method=bank_transfer`;
      } else if (paymentMethod === 'ozow') {
        // Handle Ozow payment flow
        await handleOzowPayment();
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setPaymentError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleYocoPayment = async (result: any) => {
    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: result.id,
          amountInCents: Math.round(total * 100),
          currency: 'ZAR'
        })
      });

      const data = await response.json();

      if (data.success) {
        // Create WooCommerce order after successful payment
        const order = await createWooCommerceOrder('Yoco Payment Gateway', data.charge?.id);

        // Generate a reference for the order
        const orderRef = `yoco-${order.id}-${Date.now()}`;

        // Save order data to localStorage
        const orderDataKey = `order_${orderRef}`;
        const orderData = {
          id: order.id,
          number: order.number,
          total: order.total,
          payment_method: 'yoco',
          payment_method_title: 'Yoco Payment Gateway',
          transaction_id: data.charge?.id || '',
          billing: {
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            address_1: address,
            address_2: '',
            city: city,
            state: province,
            postcode: postalCode,
            country: 'ZA'
          },
          shipping: {
            first_name: firstName,
            last_name: lastName,
            address_1: address,
            city: city,
            state: province,
            postcode: postalCode,
            country: 'ZA'
          },
          line_items: order.line_items || [],
          status: order.status || 'processing',
          date_created: order.date_created || new Date().toISOString()
        };
        localStorage.setItem(orderDataKey, JSON.stringify(orderData));

        // Redirect to order success page
        window.location.href = `/order-success?ref=${orderRef}&method=yoco`;
      } else {
        setPaymentError('Payment failed. Please try again.');
        setIsLoading(false);
      }
    } catch (error) {
      setPaymentError('An error occurred processing payment. Please try again.');
      setIsLoading(false);
    }
  };

  const handleOzowPayment = async () => {
    try {
      // Check if cart is populated
      if (!cart || cart.length === 0) {
        setPaymentError('Your cart is empty. Please add items before checking out.');
        return;
      }

      // Validate required fields
      if (!firstName || !lastName || !email || !phone || !address) {
        setPaymentError('Please fill out all required fields.');
        return;
      }

      console.log('Cart items for checkout:', cart);

      // Verify all items are in stock before proceeding
      for (const item of cart) {
        if (item.stockStatus === 'outofstock') {
          setPaymentError(`Sorry, ${item.name} is out of stock. Please remove it from your cart to continue.`);
          return;
        }

        console.log(`Item ${item.id} - Stock status: ${item.stockStatus}`, item);
      }

      // Prepare line items for WooCommerce order
      const lineItems = cart.map(item => {
        const lineItem: any = {
          product_id: item.mainProductId || item.id,
          quantity: item.quantity
        };

        // If this is a variation, add the variation_id
        if (item.variationId) {
          lineItem.variation_id = item.variationId;
        }

        return lineItem;
      });

      console.log('Line items for order:', lineItems);

      // Create a unique transaction reference
      const timestamp = Date.now();
      const transactionReference = `EXO-${timestamp}`;

      // Save order data to localStorage to avoid URL length limits
      const orderData = {
        lineItems,
        firstName,
        lastName,
        email,
        phone,
        address,
        totalAmount: total
      };

      // Store the order data in localStorage keyed by the transaction reference
      localStorage.setItem(`ozow_order_${transactionReference}`, JSON.stringify(orderData));
      console.log('Order data saved to localStorage with key:', `ozow_order_${transactionReference}`);

      // Full website URL from env or default
      const baseUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://exoticshoes.co.za';

      // Construct the Ozow payment request
      const ozowPayload = {
        siteCode: process.env.NEXT_PUBLIC_OZOW_SITE_CODE,
        amount: total.toFixed(2),
        transactionReference,
        // Pass customer information as optional1 field as per Ozow documentation
        customer: {
          firstName,
          lastName,
          email
        },
        // Store customer email in optional1 field
        optional1: email,
        cancelUrl: `${baseUrl}/checkout?status=cancelled&ref=${transactionReference}`,
        errorUrl: `${baseUrl}/checkout?status=error&ref=${transactionReference}`,
        successUrl: `${baseUrl}/order-success?ref=${transactionReference}&method=ozow`,
        notifyUrl: `${baseUrl}/api/ozow-notification?ref=${transactionReference}`
      };

      console.log('Initializing Ozow payment with site code:', process.env.NEXT_PUBLIC_OZOW_SITE_CODE);
      console.log('Transaction reference:', transactionReference);
      console.log('Amount:', total.toFixed(2));
      console.log('Test mode:', process.env.NEXT_PUBLIC_OZOW_TEST_MODE === 'true' ? 'true' : 'false');

      console.log('Making request to endpoint:', '/api/ozow-payment');
      const response = await fetch('/api/ozow-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ozowPayload)
      });

      const data = await response.json();
      console.log('Payment response data:', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to initialize payment');
      }

      // Redirect to Ozow payment page
      console.log('Redirecting to Ozow payment page:', data.paymentUrl);

      // Set up error handling for Ozow redirect
      const errorCheckTimer = setTimeout(() => {
        // Check if we've been redirected to an error page
        if (window.location.href.includes('request-error')) {
          console.error('Ozow payment error detected! Redirected to error page.');
          setPaymentError('Payment gateway returned an error. Please check your payment details and try again.');
        }
      }, 5000); // Check after 5 seconds

      // Cleanup timer if we successfully navigate away
      window.addEventListener('beforeunload', () => clearTimeout(errorCheckTimer));

      // Redirect to Ozow
      window.location.href = data.paymentUrl;

    } catch (error) {
      console.error('Error during payment process:', error);
      setPaymentError('An error occurred during payment. Please try again.');
    }
  };

  return (
    <div className={`min-h-screen bg-white ${lato.className}`}>
      {!pageLoaded && <PageLoading />}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-[60px] pb-8 sm:pb-12">
        <style>{styles.popupOverride}</style>

        <h1 className="text-xl sm:text-2xl font-bold mb-6 text-center" style={{fontFamily: 'var(--font-lato)'}}>
          Checkout
        </h1>

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          {/* Shipping Information */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4" style={{fontFamily: 'var(--font-lato)'}}>Shipping Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-sm" style={{fontFamily: 'var(--font-lato)'}}>First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1"
                    style={{fontFamily: 'var(--font-lato)'}}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm" style={{fontFamily: 'var(--font-lato)'}}>Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1"
                    style={{fontFamily: 'var(--font-lato)'}}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-sm" style={{fontFamily: 'var(--font-lato)'}}>Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                    style={{fontFamily: 'var(--font-lato)'}}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm" style={{fontFamily: 'var(--font-lato)'}}>Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1"
                    style={{fontFamily: 'var(--font-lato)'}}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address" className="text-sm" style={{fontFamily: 'var(--font-lato)'}}>Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1"
                  style={{fontFamily: 'var(--font-lato)'}}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="text-sm" style={{fontFamily: 'var(--font-lato)'}}>City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1"
                    style={{fontFamily: 'var(--font-lato)'}}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="province" className="text-sm" style={{fontFamily: 'var(--font-lato)'}}>Province</Label>
                  <Input
                    id="province"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="mt-1"
                    style={{fontFamily: 'var(--font-lato)'}}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postalCode" className="text-sm" style={{fontFamily: 'var(--font-lato)'}}>Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="mt-1"
                    style={{fontFamily: 'var(--font-lato)'}}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Section */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4" style={{fontFamily: 'var(--font-lato)'}}>Payment Method</h2>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => {
                setPaymentMethod(value);
                // Reset any previous payment errors when changing payment method
                setPaymentError('');
              }}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <RadioGroupItem value="yoco" id="yoco" />
                <Label htmlFor="yoco" className="flex items-center space-x-2" style={{fontFamily: 'var(--font-lato)'}}>
                  <span>Yoco Payment Gateway</span>
                  <YocoLogo height={16} />
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <RadioGroupItem value="ozow" id="ozow" />
                <Label htmlFor="ozow" className="flex items-center space-x-2" style={{fontFamily: 'var(--font-lato)'}}>
                  <span>Ozow Instant EFT</span>
                  <img
                    src="/ozow-logo.png"
                    alt="Ozow Payment"
                    className="h-5 w-auto object-contain"
                  />
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                <Label htmlFor="bank_transfer" className="flex items-center space-x-2" style={{fontFamily: 'var(--font-lato)'}}>
                  <span>Bank Transfer</span>
                  <img
                    src="/eft-logo.png"
                    alt="EFT Payment"
                    className="h-5 w-auto object-contain"
                  />
                </Label>
              </div>
            </RadioGroup>

            {/* Bank Transfer Details */}
            {paymentMethod === 'bank_transfer' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
                <p className="mb-2" style={{fontFamily: 'var(--font-lato)'}}>Please note: After placing your order, you will need to make the payment using the banking details below. Your order will be processed once payment is received.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBankingDetails(!showBankingDetails)}
                  className="w-full justify-between"
                  style={{fontFamily: 'var(--font-lato)'}}
                >
                  {showBankingDetails ? 'Hide Banking Details' : 'Show Banking Details'}
                </Button>

                {showBankingDetails && (
                  <div className="mt-3 p-3 bg-white rounded-lg space-y-1" style={{fontFamily: 'var(--font-lato)'}}>
                    <p className="font-semibold">Banking Details:</p>
                    <p>Account Name: Exotic Shoes</p>
                    <p>Account Number: 60091190369</p>
                    <p>Bank Name: First National Bank - Savings account</p>
                    <p>Branch Code: 220229</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-[url('/footer-bg.webp')] bg-cover rounded-lg overflow-hidden mb-6">
            <div className="backdrop-blur-sm bg-black/40 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white" style={{fontFamily: 'var(--font-lato)'}}>
                Order Summary
              </h2>

              {/* Order Items */}
              <div className="space-y-2 text-sm sm:text-base" style={{fontFamily: 'var(--font-lato)'}}>
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between mb-2 text-white">
                    <span>{item.name} x {item.quantity}</span>
                    <span>{formatPrice((item.price * item.quantity))}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t border-white/20" style={{fontFamily: 'var(--font-lato)'}}>
                <div className="space-y-2 text-white">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{formatPrice(shipping)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg pt-2">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Place Order Button */}
          <Button
            type="submit"
            className="w-full py-3 text-base sm:text-lg font-semibold bg-black hover:bg-gray-800 text-white"
            disabled={isLoading}
            style={{fontFamily: 'var(--font-lato)'}}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : (
              'Place Order'
            )}
          </Button>

          {paymentError && (
            <p className="mt-2 text-sm text-red-500 text-center" style={{fontFamily: 'var(--font-lato)'}}>{paymentError}</p>
          )}
        </form>

        {/* Trust Banner */}
        <div className="mt-8 relative rounded-lg overflow-hidden max-w-4xl mx-auto">
          <img
            src="/checkout-banner.webp"
            alt="Checkout Banner"
            className="w-full h-auto"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-black/20 flex items-center justify-center">
            <div className="flex items-center space-x-4 px-4 text-white">
              <Truck className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={1.5} />
              <span className="text-sm sm:text-base border-l border-white/20 pl-4" style={{fontFamily: 'var(--font-lato)'}}>
                Serving 1000s of loyal customers<br />all over the country
              </span>
            </div>
          </div>
        </div>
      </div>
      <Script src="https://js.yoco.com/sdk/v1/yoco-sdk-web.js" />
    </div>
  );
}
