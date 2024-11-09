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
  `
};

interface OrderLineItem {
  product_id: string;
  quantity: number;
  name: string;
  total: string;
}

const lato = Lato({ subsets: ['latin'], weight: ['400', '700'] });

export default function CheckoutPage() {
  const router = useRouter();
  const { cart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState('yoco'); // Default to Yoco payment
  const [paymentError, setPaymentError] = useState('');
  const [showBankingDetails, setShowBankingDetails] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State variables for shipping information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity || 0), 0);
  const shipping = 99; // Set shipping cost to R99
  const total = subtotal + shipping;

  const formatPrice = (price: number) => {
    return `R${price.toFixed(2)}`; // Format price with "R" symbol
  };

  const createWooCommerceOrder = async (paymentMethodTitle: string) => {
    console.log('Cart contents before creating order:', cart);
    try {
      const orderResponse = await fetch('https://exoticshoes.co.za/wp-json/wc/v3/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('ck_266d630c64bfc03268cb471bdd86250b7a0b13f1:cs_d9da89b71742f6404027107dcc42b52926f7cb89')
        },
        body: JSON.stringify({
          payment_method: paymentMethod,
          payment_method_title: paymentMethodTitle,
          set_paid: paymentMethod === 'yoco',
          billing: {
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            address_1: address,
            city: city,
            state: '',
            postcode: postalCode,
            country: 'ZA'
          },
          line_items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            name: item.name,
            total: (item.price * item.quantity).toFixed(2)
          })),
          shipping_lines: [
            {
              method_id: 'flat_rate',
              method_title: 'Flat Rate',
              total: shipping.toString()
            }
          ]
        })
      });

      const orderData = await orderResponse.json();

      if (orderResponse.ok) {
        console.log('Order created successfully:', orderData);
        router.push(`/order-success?orderId=${orderData.id}`);
      } else {
        setPaymentError('Failed to create order in WooCommerce: ' + orderData.message);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setPaymentError('An error occurred while creating the order. Please try again.');
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
            } else {
              await handleYocoPayment(result);
            }
          }
        });
      } else if (paymentMethod === 'bank_transfer') {
        await createWooCommerceOrder('Bank Transfer');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setPaymentError('An unexpected error occurred. Please try again.');
    } finally {
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
        await createWooCommerceOrder('Yoco Payment Gateway');
      } else {
        setPaymentError('Payment failed. Please try again.');
      }
    } catch (error) {
      setPaymentError('An error occurred processing payment. Please try again.');
    }
  };

  return (
    <div className={`min-h-screen bg-white ${lato.className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-[60px] pb-8 sm:pb-12">
        <style>{styles.popupOverride}</style>
        
        <h1 className="text-xl sm:text-2xl font-bold mb-6 text-center">
          Checkout
        </h1>

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          {/* Shipping Information */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl font-lato font-semibold mb-4">Shipping Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-sm">First Name</Label>
                  <Input 
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                  <Input 
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <Input 
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm">Phone</Label>
                  <Input 
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address" className="text-sm">Address</Label>
                <Input 
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="text-sm">City</Label>
                  <Input 
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode" className="text-sm">Postal Code</Label>
                  <Input 
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Section */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl font-lato font-semibold mb-4">Payment Method</h2>
            <RadioGroup 
              value={paymentMethod} 
              onValueChange={setPaymentMethod} 
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <RadioGroupItem value="yoco" id="yoco" />
                <Label htmlFor="yoco" className="flex items-center space-x-2">
                  <span>Yoco Payment Gateway</span>
                  <img 
                    src="/yoco-logo.png" 
                    alt="Yoco" 
                    className="h-4 w-auto object-contain"
                  />
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                <Label htmlFor="bank_transfer" className="flex items-center space-x-2">
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
                <p className="mb-2">Make your payment directly into our bank account. Please use your Order ID as the payment reference.</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowBankingDetails(!showBankingDetails)}
                  className="w-full justify-between"
                >
                  {showBankingDetails ? 'Hide Banking Details' : 'Show Banking Details'}
                </Button>
                
                {showBankingDetails && (
                  <div className="mt-3 p-3 bg-white rounded-lg space-y-1">
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
              <h2 className="text-lg sm:text-xl font-lato font-semibold mb-4 text-white">
                Order Summary
              </h2>
              
              {/* Order Items */}
              <div className="space-y-2 text-sm sm:text-base">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between mb-2 text-white">
                    <span>{item.name} x {item.quantity}</span>
                    <span>{formatPrice((item.price * item.quantity))}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t border-white/20">
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
            <p className="mt-2 text-sm text-red-500 text-center">{paymentError}</p>
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
              <span className="text-sm sm:text-base border-l border-white/20 pl-4">
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
