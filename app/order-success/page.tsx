'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface OrderDetails {
  id: string | number;
  number?: string;
  total: string;
  billing: any;
  shipping: any;
  payment_method: string;
  payment_method_title: string;
  line_items?: any[];
  status?: string;
  date_created: string;
}

export default function OrderSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <OrderSuccessContent />
      </div>
    </div>
  );
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const ref = searchParams?.get('ref') || null;
  const method = searchParams?.get('method') || 'ozow';
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Format price
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `R${numPrice.toFixed(2)}`;
  };

  useEffect(() => {
    const getOrderData = () => {
      try {
        setLoading(true);
        
        if (!ref) {
          setError("Order reference not found. Please contact customer support.");
          setLoading(false);
          return;
        }
        
        console.log('Order reference:', ref);
        console.log('Payment method:', method);
        
        // Determine the correct localStorage key based on payment method
        let orderDataKey;
        if (method === 'ozow') {
          orderDataKey = `ozow_order_${ref}`;
        } else {
          // For bank_transfer and yoco payments
          orderDataKey = `order_${ref}`;
        }
        
        console.log('Looking for order data with key:', orderDataKey);
        const storedOrderData = localStorage.getItem(orderDataKey);
        
        if (!storedOrderData) {
          console.error('Order data not found in localStorage with key:', orderDataKey);
          setError("Order data not found. Please contact customer support.");
          setLoading(false);
          return;
        }
        
        // Parse the stored order data
        const orderData = JSON.parse(storedOrderData);
        console.log('Order data retrieved from localStorage:', orderData);
        
        // Set the order data directly from localStorage
        setOrder({
          id: orderData.id || 'N/A',
          number: orderData.number || orderData.id,
          total: orderData.total || '0',
          billing: orderData.billing || {},
          shipping: orderData.shipping || {},
          payment_method: orderData.payment_method || method,
          payment_method_title: orderData.payment_method_title || 
            (method === 'bank_transfer' ? 'Bank Transfer' : 
             method === 'yoco' ? 'Yoco Payment Gateway' : 'Ozow'),
          line_items: orderData.line_items || [],
          status: orderData.status || 'processing',
          date_created: orderData.date_created || new Date().toISOString()
        });
        
        // Clear the data from localStorage to prevent duplicate orders
        localStorage.removeItem(orderDataKey);
        
        setLoading(false);
      } catch (error) {
        console.error('Error retrieving order data:', error);
        setError('Failed to retrieve order data. Please contact customer support.');
        setLoading(false);
      }
    };

    getOrderData();
  }, [ref, method]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Order Processing Error</h1>
        <p className="text-gray-700 mb-6">{error}</p>
        <Button asChild className="bg-black hover:bg-gray-800 text-white">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {order ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-md overflow-hidden"
        >
          {/* Success Header */}
          <div className="text-center p-8 bg-gradient-to-r from-green-50 to-green-100">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-block"
            >
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
            <p className="text-gray-600">Thank you for shopping with Exotic Shoes</p>
            <p className="text-gray-600 mt-2">Order #{order.id}</p>
          </div>

          <div className="p-6">
            {/* Payment Method */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Payment Method</h3>
              <p className="text-gray-600">{order.payment_method_title}</p>

              {/* Banking Details for Bank Transfer */}
              {order.payment_method === 'bank_transfer' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-4">
                    Please make your payment using the banking details below. Use your Order #{order.id} as the payment reference.
                  </p>
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-gray-900">Banking Details:</p>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-600">Account Name:</span>
                        <span className="text-gray-900 font-medium">Exotic Shoes</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-600">Account Number:</span>
                        <span className="text-gray-900 font-medium">60091190369</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-600">Bank Name:</span>
                        <span className="text-gray-900 font-medium">First National Bank - Savings account</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-600">Branch Code:</span>
                        <span className="text-gray-900 font-medium">220229</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Shipping Address */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Shipping Address</h3>
              <div className="text-gray-600">
                <p>{order.shipping?.first_name} {order.shipping?.last_name}</p>
                <p>{order.shipping?.address_1}</p>
                <p>{order.shipping?.city}</p>
                <p>{order.shipping?.state} {order.shipping?.postcode}</p>
                <p>{order.shipping?.country}</p>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.line_items && order.line_items.length > 0 ? (
                  order.line_items.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="flex justify-between items-center"
                    >
                      <div className="text-gray-600">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-gray-500 ml-2">× {item.quantity}</span>
                      </div>
                      <span className="text-gray-900 font-bold">
                        {formatPrice(item.total || (item.price * item.quantity))}
                      </span>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-gray-500 italic">Your order has been received. Details will be available once processing is complete.</p>
                )}
              </div>
            </div>

            {/* Order Total */}
            <div className="pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Total</span>
                <span className="text-gray-900 font-bold text-xl">{formatPrice(order.total)}</span>
              </div>
            </div>

            {/* Continue Shopping Button */}
            <div className="mt-8 text-center">
              <Button asChild className="bg-black hover:bg-gray-800 text-white px-6 py-2">
                <Link href="/">Continue Shopping</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
          <p className="text-gray-700 mb-6">We couldn't find your order information. Please contact customer support.</p>
          <Button asChild className="bg-black hover:bg-gray-800 text-white">
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
