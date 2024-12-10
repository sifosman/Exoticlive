'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Lato } from 'next/font/google';

const lato = Lato({ subsets: ['latin'], weight: ['400', '700'] });

interface OrderDetails {
  id: string;
  total: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    address_1: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  shipping: {
    address_1: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items: Array<{
    name: string;
    quantity: number;
    subtotal: string;
  }>;
  payment_method_title: string;
  payment_method: string;
  status: string;
  date_created: string;
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || null;
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      // Fetch order details from your API
      fetch(`/api/orders/${id}`)
        .then(res => res.json())
        .then(data => {
          setOrder(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching order:', error);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 pt-[100px]">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-white ${lato.className}`}>
      <div className="container mx-auto px-4 py-16 pt-[100px]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          {/* Success Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-block"
            >
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            </motion.div>
            <h1 className="text-3xl font-lato font-bold text-gray-900 mb-2">Order Confirmed!</h1>
            <p className="text-gray-600">Thank you for shopping with Exotic Shoes</p>
          </div>

          {/* Order Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg p-6 mb-8"
          >
            {order ? (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-lato font-semibold text-gray-900 mb-2">Order #{order.id}</h2>
                  <p className="text-gray-600">
                    {new Date(order.date_created).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

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
                          <div className="flex justify-between p-2 bg-white rounded border-2 border-gray-200">
                            <span className="text-gray-600">Reference:</span>
                            <span className="text-gray-900 font-medium">Order #{order.id}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Shipping Address */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h3 className="font-lato font-semibold text-gray-900 mb-2">Shipping Address</h3>
                  <div className="text-gray-600">
                    <p>{order.shipping.address_1}</p>
                    <p>{order.shipping.city}</p>
                    <p>{order.shipping.state} {order.shipping.postcode}</p>
                    <p>{order.shipping.country}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-6">
                  <h3 className="font-lato font-semibold text-gray-900 mb-4">Order Items</h3>
                  <div className="space-y-4">
                    {order.line_items.map((item, index) => (
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
                          {formatPrice(item.subtotal ? parseFloat(item.subtotal) : 0)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Order Total */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="font-lato font-semibold text-gray-900">Total</span>
                    <span className="font-lato font-bold text-gray-900">
                      {order.total ? formatPrice(parseFloat(order.total)) : formatPrice(0)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-600 text-center">Order not found</p>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center"
          >
            <Link href="/" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full bg-gray-50 hover:bg-gray-100 text-gray-900 border-gray-200"
              >
                Continue Shopping
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
