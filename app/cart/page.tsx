"use client";

import { useCart } from '@/lib/cartContext';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Lato } from 'next/font/google';
import { useState } from 'react';

// Import the Lato font
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'] });

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity } = useCart();
  const router = useRouter();
  const [imageError, setImageError] = useState<{ [key: string]: boolean }>({});

  const total = cart.reduce((sum, item) => {
    const price = item.price;
    return sum + (isNaN(price) ? 0 : price * item.quantity);
  }, 0);

  const formatPrice = (price: number) => {
    return `R${price.toFixed(2)}`;
  };

  const handleCheckout = () => {
    router.push('/checkout');
  };

  return (
    <div className={`container mx-auto my-16 px-24 py-8 ${lato.className}`}>
      <h1 className="text-2xl font-lato font-bold mb-8">Your Cart</h1>
      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center border-b py-4">
                <Image
                  src={imageError[item.id] ? '/product-placeholder.webp' : item.image}
                  alt={item.name}
                  width={80}
                  height={80}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{ width: '20%', height: 'auto', padding: '20px' }}
                  onError={() => {
                    setImageError(prev => ({ ...prev, [item.id]: true }));
                  }}
                />
                <div className="flex-grow">
                  <h3 className="font-semibold">{item.name}</h3>
                  {item.variationName && <p className="text-sm text-gray-600">{item.variationName}</p>}
                  <p className="text-gray-600">{formatPrice(item.price)}</p>
                  <div className="flex items-center mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1), item.variationId)}
                    >
                      -
                    </Button>
                    <span className="mx-2">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.id, item.quantity + 1, item.variationId)}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-500"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="md:col-span-1">
            <div className="bg-[url('/footer-bg.webp')] bg-cover p-6 rounded-lg text-white relative">
              <div className="absolute inset-0 bg-white/10 rounded-lg"></div>
              <div className="relative z-10">
                <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
                <div className="flex justify-between mb-2">
                  <span>Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="border-t border-white/20 pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
                <Button 
                  className="w-full mt-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/50" 
                  onClick={handleCheckout}
                >
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
