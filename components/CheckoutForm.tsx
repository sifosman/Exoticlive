import { useState } from 'react';
import { useRouter } from 'next/router';
import { processOrderStockUpdates } from '../utils/stock-management';

// Define types for cart items and cart
type CartItem = {
  id: string;
  product_id: string;
  variation_id?: string | null;
  quantity: number;
  stock_quantity?: number;
};

type Cart = {
  items: CartItem[];
};

export default function CheckoutForm() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart>({ items: [] });
  const [paymentSuccessful, setPaymentSuccessful] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // ... existing payment processing code ...
      // Assume this sets paymentSuccessful to true if payment is successful
      
      // For demo purposes we're simulating payment success
      setPaymentSuccessful(true);
      
      if (paymentSuccessful) {
        // Prepare order data based on your checkout form and cart
        const orderData = {
          line_items: cart.items.map((item: CartItem) => ({
            product_id: item.product_id,
            variation_id: item.variation_id || null,
            quantity: item.quantity
          })),
          // Add other necessary order details
        };

        // Create order in WooCommerce
        const response = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });

        if (response.ok) {
          const order = await response.json();
          
          // Generate unique order reference
          const orderReference = `order-${order.id}`;
          
          // Format items for stock update
          const orderItems = cart.items.map(item => ({
            productId: item.product_id,
            variationId: item.variation_id || null,
            quantity: item.quantity,
            currentStock: item.stock_quantity
          }));
          
          // Update stock in WooCommerce immediately
          try {
            await processOrderStockUpdates(orderItems, orderReference);
            console.log('Stock updated successfully for order:', orderReference);
          } catch (stockError) {
            // Log stock update error but don't fail the checkout
            console.error('Failed to update stock:', stockError);
          }
          
          // Redirect to success page
          router.push(`/order-success?id=${order.id}`);
        } else {
          const errorData = await response.json();
          setError(`Failed to create order: ${errorData.message}`);
        }
      } else {
        setError('Payment was not successful. Please try again.');
      }
    } catch (error) {
      setError(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mt-12 font-lato">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <form onSubmit={(e) => { e.preventDefault(); handlePlaceOrder(); }}>
            {/* ... existing form fields ... */}
            <button 
              type="submit" 
              disabled={isProcessing}
              className={`bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/50 px-6 py-2 rounded-lg w-full ${
                isProcessing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isProcessing ? 'Processing...' : 'Place Order'}
            </button>
            {error && <p className="error text-red-500 mt-4">{error}</p>}
          </form>
        </div>

        <div className="md:col-span-1">
          <div className="bg-[url('/images/footer-bg.jpg')] bg-cover p-6 rounded-lg text-white relative">
            <div className="absolute inset-0 bg-white/10 rounded-lg"></div>
            <div className="relative z-10">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              {/* ... order summary content ... */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
