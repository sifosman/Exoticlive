"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function DebugPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [env, setEnv] = useState<any>(null);
  const router = useRouter();

  const testLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setLoading(true);

    try {
      console.log('Debug login attempt for:', username);
      const startTime = Date.now();
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { parseError: true, rawText: text };
      }
      
      setResult({
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`,
        headers: Object.fromEntries([...response.headers.entries()]),
        data: data
      });

      // If login was successful, redirect to account page after a short delay
      if (response.ok && data.success) {
        setTimeout(() => {
          router.push('/account');
        }, 1500); // Short delay to allow viewing the success response
      }
    } catch (error) {
      setResult({
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const checkEnvironment = async () => {
    try {
      const response = await fetch('/api/debug/environment');
      const data = await response.json();
      setEnv(data);
    } catch (error) {
      setEnv({
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug Tool</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={testLogin}>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="debug-username">Username or Email</Label>
                  <Input 
                    id="debug-username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="debug-password">Password</Label>
                  <Input 
                    id="debug-password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <Button 
                className="w-full mt-4" 
                type="submit"
                disabled={loading}
              >
                {loading ? 'Testing...' : 'Test Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Environment Check</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={checkEnvironment}
            >
              Check Environment Variables
            </Button>
            
            {env && (
              <div className="mt-4 p-2 bg-gray-100 rounded overflow-auto max-h-48">
                <pre className="text-xs">{JSON.stringify(env, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Login Test Results</CardTitle>
            {result.status === 200 && result.data.success && (
              <p className="text-green-500 mt-1">Login successful! Redirecting to account page...</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
              <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
