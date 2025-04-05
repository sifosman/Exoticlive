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

// Safe function to decode product IDs
const safeDecodeId = (encodedId: string): string => {
  try {
    // Check if the string is actually base64 encoded
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

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const ref = searchParams?.get('ref') || null;
  const method = searchParams?.get('method') || 'ozow';
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function createOrder() {
      if (!ref) {
        setError("Missing order reference");
        setLoading(false);
        return;
      }

      try {
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

        // Clear the data from localStorage to prevent duplicate orders
        localStorage.removeItem(orderDataKey);

        // Prepare line items for WooCommerce
        const lineItems = orderData.cartItems.map((item: any) => {
          // Safely handle product ID (could be base64 encoded from GraphQL)
          let productId = item.id;
          try {
            if (/^[A-Za-z0-9+/=]+$/.test(productId)) {
              productId = safeDecodeId(productId);
            }
          } catch (e) {
            console.error('Error processing product ID:', e);
          }

          // Extract attribute values for meta data
          const metaData = [];
          if (item.attributes && item.attributes.length > 0) {
            item.attributes.forEach((attr: any) => {
              metaData.push({
                key: attr.name,
                value: attr.value
              });
            });
          }

          return {
            product_id: productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: (item.price * item.quantity).toString(),
            meta_data: metaData
          };
        });

        // Prepare order payload
        const orderPayload = {
          payment_method: "ozow",
          payment_method_title: "Ozow Payment Gateway",
          set_paid: true, // Mark as paid since payment was successful
          status: "processing",
          billing: {
            first_name: orderData.firstName,
            last_name: orderData.lastName,
            email: orderData.email,
            phone: orderData.phone,
            address_1: orderData.address,
            city: orderData.city,
            state: orderData.state,
            postcode: orderData.zipCode,
            country: "ZA"
          },
          shipping: {
            first_name: orderData.firstName,
            last_name: orderData.lastName,
            address_1: orderData.address,
            city: orderData.city,
            state: orderData.state,
            postcode: orderData.zipCode,
            country: "ZA"
          },
          line_items: lineItems,
          shipping_lines: [
            {
              method_id: "flat_rate",
              method_title: "Flat Rate",
              total: orderData.shippingCost.toString()
            }
          ],
          meta_data: [
            {
              key: "_reduce_stock",
              value: "yes"
            },
            {
              key: "ozow_transaction_id",
              value: ref
            }
          ]
        };

        console.log('Creating WooCommerce order with payload:', orderPayload);

        // For Ozow payments, we need to create the order in WooCommerce
        // For bank_transfer and yoco, the order has already been created
        let createdOrder;

        if (method === 'ozow') {
          // Create the order in WooCommerce
          const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://wp.exoticshoes.co.za';
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
            throw new Error(`Failed to create order: ${response.status} ${response.statusText} - ${errorText}`);
          }

          createdOrder = await response.json();
        } else {
          // For bank_transfer and yoco, use the order data from localStorage
          createdOrder = {
            id: orderData.id,
            number: orderData.number,
            total: orderData.total,
            payment_method: orderData.payment_method,
            payment_method_title: orderData.payment_method_title,
            billing: orderData.billing
          };
        }

        // Set the order data
        console.log('Order processed successfully:', createdOrder);

        // Set the order data from the response
        setOrder({
          id: createdOrder.id,
          total: createdOrder.total,
          billing: createdOrder.billing,
          shipping: createdOrder.shipping || {},
          line_items: createdOrder.line_items || [],
          payment_method_title: createdOrder.payment_method_title || (method === 'bank_transfer' ? 'Bank Transfer' : method === 'yoco' ? 'Yoco Payment Gateway' : 'Ozow'),
          payment_method: createdOrder.payment_method || method,
          status: createdOrder.status || 'processing',
          date_created: createdOrder.date_created || new Date().toISOString()
        });

        setLoading(false);
      } catch (error) {
        console.error('Error creating order:', error);
        setError('Failed to process your order. Please contact customer support.');
        setLoading(false);
      }
    }

    createOrder();
  }, [ref]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 pt-[100px]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold">Processing Your Order</h2>
            <p className="text-gray-600">Please wait while we finalize your order...</p>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 pt-[100px]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-red-600">Order Processing Error</h2>
            <p className="text-gray-600">{error}</p>
          </div>
          <div className="text-center mt-8">
            <Link href="/checkout">
              <Button variant="outline" className="mx-2">Return to Checkout</Button>
            </Link>
            <Link href="/">
              <Button className="mx-2">Continue Shopping</Button>
            </Link>
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
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900 font-medium">{formatPrice(parseFloat(order.total))}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-gray-900 font-lato font-bold">Total</span>
                    <span className="text-gray-900 font-lato font-bold text-xl">{formatPrice(parseFloat(order.total))}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Order details not available</p>
              </div>
            )}
          </motion.div>

          {/* Continue Shopping Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center"
          >
            <Link href="/">
              <Button className="px-8 py-2">
                Continue Shopping
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function OrderSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}

export default OrderSuccessPage;
