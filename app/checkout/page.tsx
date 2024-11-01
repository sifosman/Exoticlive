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
    <div className="container mx-auto px-16 pt-[100px] pb-12 font-lato">
      {/* Add this style tag before your content */}
      <style>{styles.popupOverride}</style>
      
      <h1 className="text-3xl font-bold mb-12 font-lato px-8 text-center">Checkout</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 px-8">
        <div>
          <h2 className="text-xl font-semibold mb-4 font-lato">Shipping Information</h2>
          <div className="space-y-4 font-lato">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mt-8 mb-4 font-lato">Payment Method</h2>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="font-lato space-y-4">
            <div className="flex items-center space-x-4">
            
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yoco" id="yoco" />
                <Label htmlFor="yoco">Yoco Payment Gateway</Label>
                <img 
                src="/yoco-logo.png" 
                alt="Yoco" 
                className="h-4 w-auto object-contain"
              />
              </div>
             
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
              
                <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                <Label className="mx-2" htmlFor="bank_transfer">Bank Transfer</Label>
                <img 
                src="/eft-logo.png" 
                alt="EFT Payment" 
                className="h-6 w-auto object-contain"
              />
              </div>
             
            </div>
          </RadioGroup>

          {paymentMethod === 'bank_transfer' && (
            <div className="mt-4 p-4 border border-gray-300 rounded font-lato">
              <p>Make your payment directly into our bank account. Please use your Order ID as the payment reference. Your order will not be shipped until the funds have cleared in our account.</p>
              <p>Once paid, please email proof of payment to <a href="mailto:sameer.exoticshoes@gmail.com" className="text-blue-500">sameer.exoticshoes@gmail.com</a></p>
              <Button variant="link" onClick={() => setShowBankingDetails(!showBankingDetails)}>
                {showBankingDetails ? 'Hide Banking Details' : 'Show Banking Details'}
              </Button>
              {showBankingDetails && (
                <div className="mt-2 p-2 border border-gray-300 rounded">
                  <h3 className="font-semibold">Banking Details:</h3>
                  <p>Account Name: Exotic Shoes</p>
                  <p>Account Number: 60091190369</p>
                  <p>Bank Name: First National Bank - Savings account</p>
                  <p>Branch Code: 220229</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 font-lato">Order Summary</h2>
          <div className="bg-[url('/footer-bg.webp')] bg-cover p-6 rounded-lg text-white relative">
            <div className="absolute inset-0 bg-white/10 rounded-lg"></div>
            <div className="relative z-10 font-lato">
              <div className="absolute inset-[5px] bg-white/10 backdrop-blur-sm rounded-lg"></div>
              <div className="relative z-10 p-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between mb-2">
                    <span>{item.name} x {item.quantity}</span>
                    <span>{formatPrice((item.price * item.quantity))}</span>
                  </div>
                ))}
                <Separator className="my-4 bg-white/20" />
                <div className="flex justify-between mb-2">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Shipping</span>
                  <span>{formatPrice(shipping)}</span>
                </div>
                <Separator className="my-4 bg-white/20" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
          <Button 
            type="submit" 
            className="w-full mt-8 bg-black hover:bg-[#809A48] backdrop-blur-sm text-white border border-white/50 font-lato text-lg py-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Place Order'
            )}
          </Button>
          {paymentError && <p className="text-red-500 mt-2 font-lato">{paymentError}</p>}
          <div className="mt-8 relative overflow-hidden">
            <img 
              src="/checkout-banner.webp" 
              alt="Checkout Banner" 
              className="w-full h-auto rounded-lg"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black/10 backdrop-blur-[2px] rounded-lg"></div>
            
            <div className="absolute inset-0 flex items-center justify-center px-8">
              <div className="flex items-center space-x-6">
                <Truck className="w-12 h-12 text-white opacity-90" strokeWidth={1.5} />
                <span className={`text-white text-xl md:text-2xl lg:text-3xl tracking-wider leading-relaxed border-l border-white/20 pl-6`}>
                  Serving 1000s of <br /> loyal customers
                  <br />
                  all over the country
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>
      <Script src="https://js.yoco.com/sdk/v1/yoco-sdk-web.js" />
    </div>
  );
}
