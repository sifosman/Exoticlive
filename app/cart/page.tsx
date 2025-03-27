"use client";

import { useCart } from '@/lib/cartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, ShoppingBag, ArrowLeft, RefreshCw, CreditCard, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Lato } from 'next/font/google';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const lato = Lato({ subsets: ['latin'], weight: ['400', '700'] });

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
  const router = useRouter();
  const [imageError, setImageError] = useState<{ [key: string]: boolean }>({});
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: number;
    code: string;
    discountType: string;
    amount: number;
    discountAmount: number;
  } | null>(null);

  // Calculate cart summary values
  const { subtotal } = cart.reduce((acc, item) => {
    const itemPrice = item.price;
    const itemSubtotal = itemPrice * item.quantity;
    
    return {
      subtotal: acc.subtotal + itemSubtotal,
    };
  }, { subtotal: 0 }); // Remove shipping from cart page

  const total = subtotal - discountAmount;

  // Format price consistently
  const formatPrice = (price: number) => `R${price.toFixed(2)}`;

  // Handle quantity changes
  const handleQuantityChange = (
    productId: number, 
    variationId: number | null, 
    newQuantity: number,
    stockLimit: number
  ) => {
    if (newQuantity < 1) return;
    if (stockLimit !== Infinity && newQuantity > stockLimit) {
      newQuantity = stockLimit;
    }
    updateQuantity(productId, variationId, newQuantity);
  };

  // Checkout handler
  const handleCheckoutClick = () => {
    // Navigate to checkout page or process checkout
    router.push('/checkout');
  };

  // Handle coupon application with WooCommerce
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);
    setCouponError(null);

    try {
      // Call our API that validates against WooCommerce
      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          couponCode: couponCode.trim(),
          cartItems: cart,
          subtotal: subtotal
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setCouponError(data.message || 'Invalid coupon code');
        setDiscountAmount(0);
        setAppliedCoupon(null);
      } else {
        // Successfully applied coupon
        setAppliedCoupon(data.coupon);
        setDiscountAmount(data.coupon.discountAmount);
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      setCouponError('An error occurred while applying the coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setDiscountAmount(0);
    setCouponError(null);
  };

  return (
    <div className={`min-h-screen bg-white ${lato.className}`}>
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="flex flex-col items-center text-center mb-8">
          <h1 className={`text-2xl md:text-3xl font-bold ${lato.className}`}>Shopping Cart</h1>
          <span className={`text-gray-500 ${lato.className} mt-1`}>{cart.length} {cart.length === 1 ? 'item' : 'items'}</span>
        </div>

        {cart.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="flex justify-center mb-4">
              <ShoppingBag size={64} className="text-gray-300" />
            </div>
            <h2 className={`text-xl font-semibold mb-2 ${lato.className}`}>Your cart is empty</h2>
            <p className={`text-gray-500 mb-6 ${lato.className}`}>Looks like you haven't added anything to your cart yet.</p>
            <Button 
              onClick={() => router.push('/shop')}
              className="bg-[#0f172a] hover:bg-[#1e293b] text-white"
            >
              <ArrowLeft size={16} className="mr-2" />
              Continue Shopping
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
                {/* Cart Header */}
                <div className="px-6 py-4 border-b border-gray-100 hidden md:flex">
                  <div className={`w-2/3 font-semibold ${lato.className}`}>Product</div>
                  <div className={`w-1/6 text-center font-semibold ${lato.className}`}>Price</div>
                  <div className={`w-1/6 text-center font-semibold ${lato.className}`}>Quantity</div>
                  <div className={`w-1/6 text-center font-semibold ${lato.className}`}>Total</div>
                </div>

                {/* Cart Items */}
                <div className="divide-y divide-gray-100">
                  {cart.map((item) => {
                    const itemTotal = item.price * item.quantity;
                    const stockLimit = item.stockQuantity || Infinity;
                    const isLowStock = stockLimit > 0 && stockLimit <= 5;
                    const isOutOfStock = item.stockStatus === 'outofstock' || stockLimit === 0;

                    return (
                      <div key={`${item.id}-${item.variationId}`} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center">
                        {/* Product Details */}
                        <div className="md:w-2/3 mb-4 md:mb-0">
                          <h3 className={`font-semibold text-sm md:text-base ${lato.className}`}>{item.name}</h3>
                          {item.variationName && (
                            <p className={`text-xs text-gray-500 mt-1 ${lato.className}`}>
                              {item.variationName}
                            </p>
                          )}
                          
                          {/* Stock Status - Mobile Only */}
                          <div className="md:hidden mt-1">
                            {isOutOfStock ? (
                              <span className={`text-xs font-medium text-red-500 ${lato.className}`}>Out of stock</span>
                            ) : isLowStock ? (
                              <span className={`text-xs font-medium text-amber-500 ${lato.className}`}>Only {stockLimit} left</span>
                            ) : (
                              <span className={`text-xs font-medium text-green-500 ${lato.className}`}>In stock</span>
                            )}
                          </div>
                          
                          {/* Mobile Price */}
                          <div className="md:hidden mt-2">
                            <span className={`font-medium ${lato.className}`}>{formatPrice(item.price)}</span>
                          </div>
                        </div>

                        {/* Desktop: Price */}
                        <div className="hidden md:block md:w-1/6 text-center">
                          <span className={`font-medium ${lato.className}`}>{formatPrice(item.price)}</span>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center md:justify-center md:w-1/6 mt-3 md:mt-0">
                          <div className="flex items-center">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-l-md"
                              onClick={() => handleQuantityChange(item.id, item.variationId, item.quantity - 1, stockLimit)}
                              disabled={item.quantity <= 1 || isOutOfStock}
                            >
                              -
                            </Button>
                            <div className="h-8 w-10 flex items-center justify-center border-y border-gray-200">
                              {item.quantity}
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-r-md"
                              onClick={() => handleQuantityChange(item.id, item.variationId, item.quantity + 1, stockLimit)}
                              disabled={item.quantity >= stockLimit || isOutOfStock}
                            >
                              +
                            </Button>
                          </div>
                          
                          {/* Stock Status - Desktop */}
                          <div className="hidden md:block ml-2">
                            {isOutOfStock ? (
                              <span className={`text-xs font-medium text-red-500 ${lato.className}`}>Out of stock</span>
                            ) : isLowStock ? (
                              <span className={`text-xs font-medium text-amber-500 ${lato.className}`}>Low stock</span>
                            ) : null}
                          </div>
                        </div>

                        {/* Item Total & Remove */}
                        <div className="flex items-center justify-between md:justify-end md:w-1/6 mt-4 md:mt-0">
                          <div className={`font-medium md:mr-6 ${lato.className}`}>
                            {formatPrice(itemTotal)}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromCart(item.id, item.variationId)}
                            className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cart Actions */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8 lg:mb-0">
                {/* Continue Shopping */}
                <Button 
                  variant="outline" 
                  className="border-gray-300 hover:bg-gray-50"
                  onClick={() => router.push('/shop')}
                >
                  <ArrowLeft size={16} className="mr-2" />
                  <span className={`text-sm ${lato.className}`}>Continue Shopping</span>
                </Button>
                
                {/* Clear Cart */}
                <Button 
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50" 
                  onClick={() => {
                    if (confirm('Are you sure you want to clear your cart?')) {
                      clearCart();
                    }
                  }}
                >
                  <RefreshCw size={16} className="mr-2" />
                  <span className={`text-sm ${lato.className}`}>Clear Cart</span>
                </Button>
                
                {/* Apply Coupon - Mobile */}
                <div className="sm:hidden">
                  <div className={`mt-4 mb-2 font-medium ${lato.className}`}>Have a coupon?</div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      variant="outline"
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon || !couponCode.trim()}
                    >
                      {isApplyingCoupon ? 'Applying...' : 'Apply Coupon'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6 h-fit">
              <h2 className={`text-lg font-semibold mb-4 ${lato.className}`}>Order Summary</h2>
              
              {/* Coupon Input */}
              <div className="mb-6">
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <Input 
                    placeholder="Enter coupon code" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="submit" 
                    variant="outline"
                    disabled={isApplyingCoupon}
                  >
                    {isApplyingCoupon ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Apply'}
                  </Button>
                </form>
              </div>
              
              {couponError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription className={`text-xs ${lato.className}`}>
                    {couponError}
                  </AlertDescription>
                </Alert>
              )}
              
              {appliedCoupon && (
                <div className="mb-4 p-2 bg-green-50 border border-green-100 rounded-md flex justify-between items-center">
                  <div>
                    <span className={`text-sm font-medium text-green-800 ${lato.className}`}>{appliedCoupon.code}</span>
                    <p className={`text-xs text-green-600 ${lato.className}`}>
                      {appliedCoupon.discountType === 'percent' 
                        ? `${appliedCoupon.amount}% off`
                        : `${formatPrice(appliedCoupon.amount)} off`
                      }
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleRemoveCoupon}
                    className="h-8 text-gray-500 hover:text-red-500 hover:bg-red-50 p-0 w-8"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              )}
              
              {/* Order Details */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className={`text-gray-500 ${lato.className}`}>Subtotal</span>
                  <span className={`font-medium ${lato.className}`}>{formatPrice(subtotal)}</span>
                </div>
                
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className={`text-gray-500 ${lato.className}`}>Discount</span>
                    <span className={`font-medium ${lato.className}`}>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-100 pt-3 flex justify-between font-semibold">
                  <span className={`text-gray-500 ${lato.className}`}>Total</span>
                  <span className={`text-lg font-bold ${lato.className}`}>{formatPrice(total)}</span>
                </div>
              </div>
              
              <Button 
                className="w-full mt-6 bg-[#0f172a] hover:bg-[#1e293b] text-white"
                size="lg"
                onClick={handleCheckoutClick}
              >
                <CreditCard size={18} className="mr-2" />
                <span className={`text-base ${lato.className}`}>Proceed to Checkout</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
