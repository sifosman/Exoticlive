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

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [initialUserData, setInitialUserData] = useState<UserData | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-medium mb-2">Recent Orders</h3>
                        <p className="text-gray-500">You have no recent orders.</p>
                        <Button 
                          variant="outline" 
                          className="mt-4 border-[#829D46] text-[#829D46] hover:bg-[#829D46] hover:text-white"
                          onClick={() => document.querySelector('[value="orders"]')?.dispatchEvent(new Event('click'))}
                          style={{fontFamily: 'var(--font-lato)'}}
                        >
                          View Orders
                        </Button>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-medium mb-2">Account Details</h3>
                        <p className="text-gray-500">Manage your account information.</p>
                        <Button 
                          variant="outline" 
                          className="mt-4 border-[#829D46] text-[#829D46] hover:bg-[#829D46] hover:text-white"
                          onClick={() => document.querySelector('[value="account-details"]')?.dispatchEvent(new Event('click'))}
                          style={{fontFamily: 'var(--font-lato)'}}
                        >
                          Edit Details
                        </Button>
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