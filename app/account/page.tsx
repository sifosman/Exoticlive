"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string;
  name: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // If not logged in, redirect to login page
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
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
    // Implement save changes logic here
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Account</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Avatar className="w-24 h-24 mb-4">
              <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
              <AvatarFallback>{user.first_name.charAt(0)}{user.last_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-semibold">{user.first_name} {user.last_name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              Log Out
            </Button>
          </CardFooter>
        </Card>
        <div className="col-span-1 md:col-span-3">
          <Tabs defaultValue="dashboard">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="addresses">Addresses</TabsTrigger>
              <TabsTrigger value="account-details">Account Details</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome back, {user.first_name}!</CardTitle>
                  <CardDescription>Here's an overview of your account.</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Add dashboard content here */}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Your Orders</CardTitle>
                  <CardDescription>View and manage your orders.</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Add orders list here */}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="addresses">
              <Card>
                <CardHeader>
                  <CardTitle>Your Addresses</CardTitle>
                  <CardDescription>Manage your shipping and billing addresses.</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Add address management here */}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="account-details">
              <Card>
                <CardHeader>
                  <CardTitle>Account Details</CardTitle>
                  <CardDescription>Update your account information.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveChanges}>
                    <div className="grid w-full items-center gap-4">
                      <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="first_name">First Name</Label>
                        <Input id="first_name" value={user.first_name} onChange={(e) => setUser({...user, first_name: e.target.value})} />
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={user.name} onChange={(e) => setUser({...user, name: e.target.value})} />
                      </div>
                      <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={user.email} onChange={(e) => setUser({...user, email: e.target.value})} />
                      </div>
                    </div>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline">Cancel</Button>
                  <Button onClick={handleSaveChanges}>Save Changes</Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}