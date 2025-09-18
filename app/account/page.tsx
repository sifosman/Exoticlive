"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface UserData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  name: string;
  billing?: any;
  shipping?: any;
}

interface OrderItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  taxes: any[];
  meta_data: any[];
  sku: string;
  price: number;
  image: {
    id: string;
    src: string;
  };
}

interface Order {
  id: number;
  parent_id: number;
  status: string;
  currency: string;
  version: string;
  prices_include_tax: boolean;
  date_created: string;
  date_modified: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  customer_id: number;
  order_key: string;
  billing: any;
  shipping: any;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  customer_ip_address: string;
  customer_user_agent: string;
  created_via: string;
  customer_note: string;
  date_completed: string;
  date_paid: string;
  cart_hash: string;
  number: string;
  meta_data: any[];
  line_items: OrderItem[];
  tax_lines: any[];
  shipping_lines: any[];
  fee_lines: any[];
  coupon_lines: any[];
  refunds: any[];
  payment_url: string;
  is_editable: boolean;
  needs_payment: boolean;
  needs_processing: boolean;
  date_created_gmt: string;
  date_modified_gmt: string;
  date_completed_gmt: string;
  date_paid_gmt: string;
  currency_symbol: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [initialUserData, setInitialUserData] = useState<UserData | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Function to fetch user orders
  const fetchOrders = async () => {
    if (!user) return;

    try {
      setOrdersLoading(true);
      console.log('Fetching orders for user:', user.id);

      // Try the customer orders endpoint first
      try {
        const directResponse = await fetch(`/api/orders/customer/${user.id}`);

        if (directResponse.ok) {
          const ordersData = await directResponse.json();
          setOrders(ordersData);
          console.log('Fetched orders using customer endpoint:', ordersData);
          return; // Exit if successful
        } else {
          console.warn('Customer endpoint failed, falling back to user endpoint');
        }
      } catch (directError) {
        console.warn('Error with customer endpoint, falling back to user endpoint:', directError);
      }

      // Fallback to the user endpoint
      const response = await fetch('/api/orders/user');
      const responseText = await response.text();

      try {
        // Try to parse the response as JSON
        const ordersData = JSON.parse(responseText);

        if (response.ok) {
          setOrders(ordersData);
          console.log('Fetched orders using fallback endpoint:', ordersData);
        } else {
          console.error('Failed to fetch orders:', ordersData);
        }
      } catch (parseError) {
        console.error('Failed to parse orders response:', responseText);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setInitialUserData(userData); // Store initial data for comparison
        } else {
          // If not logged in, redirect to login page
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  // Fetch orders when user data is loaded
  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    // Validate passwords if they are provided
    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        setPasswordError("Passwords don't match");
        toast({
          title: "Error",
          description: "Passwords don't match. Please check and try again.",
          variant: "destructive",
        });
        return;
      }
      if (password.length < 6) {
        setPasswordError("Password must be at least 6 characters");
        toast({
          title: "Error",
          description: "Password must be at least 6 characters.",
          variant: "destructive",
        });
        return;
      }
      setPasswordError("");
    }

    // Check if any data has changed
    const hasChanges = JSON.stringify({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email
    }) !== JSON.stringify({
      first_name: initialUserData?.first_name,
      last_name: initialUserData?.last_name,
      email: initialUserData?.email
    });

    if (!hasChanges && !password) {
      toast({
        title: "No changes",
        description: "No changes were made to your account details.",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Create the update payload
      const updateData = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        ...(password ? { password } : {})
      };

      // Send update request to our API
      const response = await fetch('/api/user/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedUser = await response.json();

        // Update local state with the returned data
        setUser(updatedUser);
        setInitialUserData(updatedUser);

        // Reset password fields
        setPassword("");
        setConfirmPassword("");

        // Show success message
        toast({
          title: "Success!",
          description: "Your account details have been updated successfully.",
          className: "bg-[#829D46] text-white",
        });
      } else {
        const errorData = await response.json();

        // Show error message
        toast({
          title: "Update failed",
          description: errorData.error || "Failed to update your account details. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating user:', error);

      // Show error message
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center pt-24">
        <div className="w-16 h-16 border-4 border-t-[#829D46] border-b-[#6a8035] border-l-[#829D46] border-r-[#6a8035] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2" style={{fontFamily: 'var(--font-lato)'}}>
            Session Expired
          </h2>
          <p className="text-gray-600 mb-4" style={{fontFamily: 'var(--font-lato)'}}>
            Please log in again to access your account.
          </p>
          <Button
            onClick={() => router.push('/login')}
            className="bg-[#829D46] hover:bg-[#6a8035] text-white"
            style={{fontFamily: 'var(--font-lato)'}}
          >
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  const initials = user.first_name && user.last_name
    ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`
    : user.email?.substring(0, 2) || 'U';

  return (
    <div className="min-h-screen bg-white pt-20">
      <Toaster />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="text-3xl font-bold text-[#829D46] mb-2" style={{fontFamily: 'var(--font-playfair)'}}>
            My Account
          </div>
          <div className="w-20 h-1 bg-[#829D46] rounded"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="col-span-1 border-none shadow-md">
            <CardHeader className="pb-2">
              <div className="w-full h-1 bg-[#829D46] rounded-t-md"></div>
              <CardTitle style={{fontFamily: 'var(--font-lato)'}}>Profile</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Avatar className="w-24 h-24 mb-4 bg-[#829D46]">
                <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
                <AvatarFallback className="bg-[#829D46] text-white">{initials}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold" style={{fontFamily: 'var(--font-lato)'}}>{user.first_name} {user.last_name}</h2>
              <p className="text-sm text-gray-500" style={{fontFamily: 'var(--font-lato)'}}>{user.email}</p>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-[#829D46] hover:bg-[#6a8035] text-white"
                onClick={handleLogout}
                style={{fontFamily: 'var(--font-lato)'}}
              >
                Log Out
              </Button>
            </CardFooter>
          </Card>

          <div className="col-span-1 md:col-span-3">
            <Tabs defaultValue="dashboard" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg">
                {["dashboard", "orders", "addresses", "account-details"].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="data-[state=active]:bg-[#829D46] data-[state=active]:text-white rounded"
                    style={{fontFamily: 'var(--font-lato)'}}
                  >
                    {tab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="dashboard">
                <Card className="border-none shadow-md">
                  <CardHeader className="pb-2">
                    <div className="w-full h-1 bg-[#829D46] rounded-t-md"></div>
                    <CardTitle style={{fontFamily: 'var(--font-lato)'}}>Welcome back, {user.first_name || 'there'}!</CardTitle>
                    <CardDescription style={{fontFamily: 'var(--font-lato)'}}>Here's an overview of your account.</CardDescription>
                  </CardHeader>
                  <CardContent style={{fontFamily: 'var(--font-lato)'}}>
                    <div className="mt-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-medium mb-2">Account Details</h3>
                        <p className="text-gray-500">Manage your account information.</p>
                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                          <Button
                            variant="outline"
                            className="border-[#829D46] text-[#829D46] hover:bg-[#829D46] hover:text-white"
                            onClick={() => document.querySelector('[value="account-details"]')?.dispatchEvent(new Event('click'))}
                            style={{fontFamily: 'var(--font-lato)'}}
                          >
                            Edit Details
                          </Button>
                         
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orders">
                <Card className="border-none shadow-md">
                  <CardHeader className="pb-2">
                    <div className="w-full h-1 bg-[#829D46] rounded-t-md"></div>
                    <CardTitle style={{fontFamily: 'var(--font-lato)'}}>Your Orders</CardTitle>
                    <CardDescription style={{fontFamily: 'var(--font-lato)'}}>View and manage your orders.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ordersLoading ? (
                      <div className="py-8 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#829D46]"></div>
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="bg-gray-50 p-4 rounded-lg text-center mt-4" style={{fontFamily: 'var(--font-lato)'}}>
                        <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
                        <Button
                          className="bg-[#829D46] hover:bg-[#6a8035] text-white"
                          onClick={() => router.push('/')}
                          style={{fontFamily: 'var(--font-lato)'}}
                        >
                          Browse Products
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-4" style={{fontFamily: 'var(--font-lato)'}}>
                        {selectedOrder ? (
                          <div>
                            <Button
                              variant="outline"
                              className="mb-4"
                              onClick={() => setSelectedOrder(null)}
                            >
                              ← Back to Orders
                            </Button>

                            <div className="bg-gray-50 p-6 rounded-lg">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h3 className="text-lg font-semibold">Order #{selectedOrder.number}</h3>
                                  <p className="text-gray-500">
                                    {new Date(selectedOrder.date_created).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  selectedOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  selectedOrder.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                  selectedOrder.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                                  selectedOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                                </span>
                              </div>

                              <div className="border-t border-gray-200 pt-4 mb-4">
                                <h4 className="font-medium mb-2">Items</h4>
                                <div className="space-y-3">
                                  {selectedOrder.line_items.map((item) => (
                                    <div key={item.id} className="flex justify-between">
                                      <div className="flex items-center">
                                        {item.image && (
                                          <div className="w-12 h-12 mr-3 rounded overflow-hidden">
                                            <img
                                              src={item.image.src}
                                              alt={item.name}
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                        )}
                                        <div>
                                          <p className="font-medium">{item.name}</p>
                                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                        </div>
                                      </div>
                                      <p className="font-medium">R{parseFloat(item.total).toFixed(2)}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="border-t border-gray-200 pt-4 mb-4">
                                <h4 className="font-medium mb-2">Order Details</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <p className="text-gray-500">Subtotal:</p>
                                    <p className="text-gray-500">Shipping:</p>
                                    {parseFloat(selectedOrder.discount_total) > 0 && (
                                      <p className="text-gray-500">Discount:</p>
                                    )}
                                    <p className="font-medium mt-1">Total:</p>
                                  </div>
                                  <div className="text-right">
                                    <p>R{(parseFloat(selectedOrder.total) - parseFloat(selectedOrder.shipping_total)).toFixed(2)}</p>
                                    <p>R{parseFloat(selectedOrder.shipping_total).toFixed(2)}</p>
                                    {parseFloat(selectedOrder.discount_total) > 0 && (
                                      <p>-R{parseFloat(selectedOrder.discount_total).toFixed(2)}</p>
                                    )}
                                    <p className="font-medium mt-1">R{parseFloat(selectedOrder.total).toFixed(2)}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 pt-4">
                                <div>
                                  <h4 className="font-medium mb-2">Billing Address</h4>
                                  <div className="text-sm">
                                    <p>{selectedOrder.billing.first_name} {selectedOrder.billing.last_name}</p>
                                    {selectedOrder.billing.company && <p>{selectedOrder.billing.company}</p>}
                                    <p>{selectedOrder.billing.address_1}</p>
                                    {selectedOrder.billing.address_2 && <p>{selectedOrder.billing.address_2}</p>}
                                    <p>{selectedOrder.billing.city}, {selectedOrder.billing.state} {selectedOrder.billing.postcode}</p>
                                    <p>{selectedOrder.billing.country}</p>
                                    <p>{selectedOrder.billing.email}</p>
                                    <p>{selectedOrder.billing.phone}</p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium mb-2">Shipping Address</h4>
                                  <div className="text-sm">
                                    <p>{selectedOrder.shipping.first_name} {selectedOrder.shipping.last_name}</p>
                                    {selectedOrder.shipping.company && <p>{selectedOrder.shipping.company}</p>}
                                    <p>{selectedOrder.shipping.address_1}</p>
                                    {selectedOrder.shipping.address_2 && <p>{selectedOrder.shipping.address_2}</p>}
                                    <p>{selectedOrder.shipping.city}, {selectedOrder.shipping.state} {selectedOrder.shipping.postcode}</p>
                                    <p>{selectedOrder.shipping.country}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="border-t border-gray-200 pt-4 mt-4">
                                <h4 className="font-medium mb-2">Payment Method</h4>
                                <p>{selectedOrder.payment_method_title}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h3 className="text-lg font-medium mb-4">Order History</h3>
                            <div className="space-y-4">
                              {orders.map((order) => (
                                <div
                                  key={order.id}
                                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                                  onClick={() => setSelectedOrder(order)}
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="font-medium">Order #{order.number}</p>
                                      <p className="text-sm text-gray-500">
                                        {new Date(order.date_created).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric'
                                        })}
                                      </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                      order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                      order.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                                      order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                    </span>
                                  </div>

                                  <div className="mt-2">
                                    <p className="text-sm">
                                      <span className="text-gray-500">Total:</span>
                                      <span className="font-medium ml-1">R{parseFloat(order.total).toFixed(2)}</span>
                                    </p>
                                    <p className="text-sm">
                                      <span className="text-gray-500">Items:</span>
                                      <span className="ml-1">{order.line_items.length}</span>
                                    </p>
                                  </div>

                                  <div className="mt-3 text-right">
                                    <span className="text-sm text-[#829D46] hover:underline">
                                      View Details →
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="addresses">
                <Card className="border-none shadow-md">
                  <CardHeader className="pb-2">
                    <div className="w-full h-1 bg-[#829D46] rounded-t-md"></div>
                    <CardTitle style={{fontFamily: 'var(--font-lato)'}}>Your Addresses</CardTitle>
                    <CardDescription style={{fontFamily: 'var(--font-lato)'}}>Manage your shipping and billing addresses.</CardDescription>
                  </CardHeader>
                  <CardContent style={{fontFamily: 'var(--font-lato)'}}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div className="border p-4 rounded-lg">
                        <h3 className="text-lg font-medium mb-4">Billing Address</h3>
                        {user.billing && Object.values(user.billing).some(val => val) ? (
                          <div>
                            <p>{user.billing.first_name} {user.billing.last_name}</p>
                            <p>{user.billing.company}</p>
                            <p>{user.billing.address_1}</p>
                            <p>{user.billing.address_2}</p>
                            <p>{user.billing.city}, {user.billing.state} {user.billing.postcode}</p>
                            <p>{user.billing.country}</p>
                            <p>{user.billing.phone}</p>
                            <p>{user.billing.email}</p>
                          </div>
                        ) : (
                          <p className="text-gray-500">No billing address has been set up yet.</p>
                        )}
                        <Button
                          className="mt-4 bg-[#829D46] hover:bg-[#6a8035] text-white"
                          style={{fontFamily: 'var(--font-lato)'}}
                          onClick={() => toast({
                            title: "Coming Soon",
                            description: "Address management functionality will be available soon.",
                          })}
                        >
                          Edit Billing Address
                        </Button>
                      </div>

                      <div className="border p-4 rounded-lg">
                        <h3 className="text-lg font-medium mb-4">Shipping Address</h3>
                        {user.shipping && Object.values(user.shipping).some(val => val) ? (
                          <div>
                            <p>{user.shipping.first_name} {user.shipping.last_name}</p>
                            <p>{user.shipping.company}</p>
                            <p>{user.shipping.address_1}</p>
                            <p>{user.shipping.address_2}</p>
                            <p>{user.shipping.city}, {user.shipping.state} {user.shipping.postcode}</p>
                            <p>{user.shipping.country}</p>
                            <p>{user.shipping.phone}</p>
                          </div>
                        ) : (
                          <p className="text-gray-500">No shipping address has been set up yet.</p>
                        )}
                        <Button
                          className="mt-4 bg-[#829D46] hover:bg-[#6a8035] text-white"
                          style={{fontFamily: 'var(--font-lato)'}}
                          onClick={() => toast({
                            title: "Coming Soon",
                            description: "Address management functionality will be available soon.",
                          })}
                        >
                          Edit Shipping Address
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="account-details">
                <Card className="border-none shadow-md">
                  <CardHeader className="pb-2">
                    <div className="w-full h-1 bg-[#829D46] rounded-t-md"></div>
                    <CardTitle style={{fontFamily: 'var(--font-lato)'}}>Account Details</CardTitle>
                    <CardDescription style={{fontFamily: 'var(--font-lato)'}}>Update your account information.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveChanges} className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label
                              htmlFor="first_name"
                              className="text-sm font-medium text-gray-700"
                              style={{fontFamily: 'var(--font-lato)'}}
                            >
                              First Name
                            </Label>
                            <Input
                              id="first_name"
                              value={user.first_name || ''}
                              onChange={(e) => setUser({...user, first_name: e.target.value})}
                              className="mt-1 h-10 border-gray-300 focus:border-[#829D46] focus:ring-[#829D46]"
                              style={{fontFamily: 'var(--font-lato)'}}
                            />
                          </div>

                          <div>
                            <Label
                              htmlFor="last_name"
                              className="text-sm font-medium text-gray-700"
                              style={{fontFamily: 'var(--font-lato)'}}
                            >
                              Last Name
                            </Label>
                            <Input
                              id="last_name"
                              value={user.last_name || ''}
                              onChange={(e) => setUser({...user, last_name: e.target.value})}
                              className="mt-1 h-10 border-gray-300 focus:border-[#829D46] focus:ring-[#829D46]"
                              style={{fontFamily: 'var(--font-lato)'}}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label
                              htmlFor="email"
                              className="text-sm font-medium text-gray-700"
                              style={{fontFamily: 'var(--font-lato)'}}
                            >
                              Email Address
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              value={user.email || ''}
                              onChange={(e) => setUser({...user, email: e.target.value})}
                              className="mt-1 h-10 border-gray-300 focus:border-[#829D46] focus:ring-[#829D46]"
                              style={{fontFamily: 'var(--font-lato)'}}
                            />
                          </div>

                          <div>
                            <Label
                              htmlFor="password"
                              className="text-sm font-medium text-gray-700"
                              style={{fontFamily: 'var(--font-lato)'}}
                            >
                              New Password
                            </Label>
                            <Input
                              id="password"
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Leave blank to keep current password"
                              className="mt-1 h-10 border-gray-300 focus:border-[#829D46] focus:ring-[#829D46]"
                              style={{fontFamily: 'var(--font-lato)'}}
                            />
                          </div>

                          {password && (
                            <div>
                              <Label
                                htmlFor="confirm_password"
                                className="text-sm font-medium text-gray-700"
                                style={{fontFamily: 'var(--font-lato)'}}
                              >
                                Confirm New Password
                              </Label>
                              <Input
                                id="confirm_password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="mt-1 h-10 border-gray-300 focus:border-[#829D46] focus:ring-[#829D46]"
                                style={{fontFamily: 'var(--font-lato)'}}
                              />
                              {passwordError && (
                                <p className="text-red-500 text-sm mt-1" style={{fontFamily: 'var(--font-lato)'}}>
                                  {passwordError}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end space-x-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => router.push('/')}
                          className="border-gray-300 text-gray-700"
                          style={{fontFamily: 'var(--font-lato)'}}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-[#829D46] hover:bg-[#6a8035] text-white"
                          disabled={isSaving}
                          style={{fontFamily: 'var(--font-lato)'}}
                        >
                          {isSaving ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Saving...
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}