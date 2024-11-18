"use client";

import { useCart } from '@/lib/cartContext';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Lato } from 'next/font/google';
import { useState } from 'react';

const lato = Lato({ subsets: ['latin'], weight: ['400', '700'] });

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity } = useCart();
  const router = useRouter();
  const [imageError, setImageError] = useState<{ [key: string]: boolean }>({});

  // Calculate subtotal
  const { subtotal, total } = cart.reduce((acc, item) => {
    const itemPrice = item.price;
    const itemSubtotal = itemPrice * item.quantity;
    
    return {
      subtotal: acc.subtotal + itemSubtotal,
      total: acc.total + itemSubtotal
    };
  }, { subtotal: 0, total: 0 });

  const formatPrice = (price: number) => `R${price.toFixed(2)}`;

  return (
    <div className={`min-h-screen py-12 bg-white ${lato.className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-12">
        <h1 className="text-xl font-lato md:text-2xl font-bold mb-4 md:mb-8">Your Cart</h1>
        
        {cart.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Your cart is empty.</p>
            <Button 
              onClick={() => router.push('/products')}
              className="bg-black hover:bg-gray-800 text-white"
            >
              Continue Shopping
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-4 md:p-6">
              {cart.map((item) => (
                <div 
                  key={item.id} 
                  className="flex flex-col sm:flex-row items-start sm:items-center border-b border-gray-100 py-4 last:border-0"
                >
                  {/* Product Image */}
                  <div className="relative w-full sm:w-24 h-32 sm:h-24 mb-3 sm:mb-0">
                    <Image
                      src={imageError[item.id] ? '/product-placeholder.webp' : item.image}
                      alt={item.name}
                      fill
                      className="object-contain"
                      onError={() => setImageError(prev => ({ ...prev, [item.id]: true }))}
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-grow px-0 sm:px-4">
                    <h3 className="font-semibold text-sm md:text-base">{item.name}</h3>
                    {item.variationName && (
                      <p className="text-xs md:text-sm text-gray-600 mt-1">
                        {item.variationName}
                      </p>
                    )}
                    <p className="text-gray-900 font-medium mt-1">
                      {formatPrice(item.price)}
                    </p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center mt-2 space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1), item.variationId)}
                      >
                        -
                      </Button>
                      <span className="mx-2 text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, item.quantity + 1, item.variationId)}
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2"
                  >
                    <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-[url('/footer-bg.webp')] bg-cover rounded-lg text-white sticky top-4">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-lg"></div>
                <div className="relative z-10 p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-semibold mb-4">
                    Order Summary
                  </h2>
                  
                  <div className="space-y-3 text-sm md:text-base">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className="text-xs md:text-sm">Calculated at checkout</span>
                    </div>
                    
                    <div className="border-t border-white/20 pt-3 mt-3">
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>{formatPrice(total)}</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    className="w-full mt-4 bg-white text-gray-900 hover:bg-gray-100 font-medium"
                    onClick={() => router.push('/checkout')}
                  >
                    Proceed to Checkout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {cart.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            <p></p>
          </div>
        )}
      </div>
    </div>
  );
}
