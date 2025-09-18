"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  // Registration form states
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [registering, setRegistering] = useState(false);
  
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        console.log('Checking auth status...');
        const response = await fetch('/api/auth/check');
        console.log('Auth check response status:', response.status);
        
        const responseData = await response.json();
        console.log('Auth check response data:', responseData);
        
        if (response.ok && responseData.authenticated) {
          console.log('User is authenticated, redirecting to account page');
          router.push('/account');
        } else {
          console.log('User is not authenticated, showing login form');
        }
      } catch (err) {
        console.error('Auth check failed with error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDebugInfo(null);
    setIsLoading(true);
    
    console.log('Login attempt started for username:', username);

    try {
      console.log('Making request to /api/auth/login...');
      
      const startTime = Date.now();
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const endTime = Date.now();
      
      console.log(`Login request completed in ${endTime - startTime}ms`);
      console.log('Login response status:', response.status);
      
      const data = await response.json();
      console.log('Login response data:', data);
      
      // Save debug info
      setDebugInfo({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()]),
        data: data,
        requestTime: `${endTime - startTime}ms`
      });

      if (response.ok && data.success) {
        console.log('Login successful, redirecting to account page');
        router.push('/account');
        router.refresh(); // Ensure the page updates after redirect
      } else {
        console.error('Login failed:', data.message || 'Unknown error');
        setError(data.message || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
      setDebugInfo({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    if (!email || !regPassword || !confirmPassword) {
      setError('Email and password are required.');
      return;
    }
    
    if (regPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    
    setRegistering(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: regPassword,
          first_name: firstName,
          last_name: lastName
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Registration successful
        toast({
          title: "Account created successfully!",
          description: "You can now log in with your email and password.",
          className: "bg-[#829D46] text-white",
        });
        
        // Reset form and switch to login view
        setEmail('');
        setFirstName('');
        setLastName('');
        setRegPassword('');
        setConfirmPassword('');
        setShowRegistration(false);
        
        // Pre-fill the login form with the registered email
        setUsername(email);
      } else {
        // Registration failed
        setError(data.error || 'Failed to create account. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleRegPasswordVisibility = () => {
    setShowRegPassword(!showRegPassword);
  };

  const toggleForm = () => {
    setShowRegistration(!showRegistration);
    setError(''); // Clear any errors when switching forms
  };

  const handleForgotPassword = () => {
    router.push('/reset-password');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center pt-24">
        <div className="w-16 h-16 border-4 border-t-[#829D46] border-b-[#6a8035] border-l-[#829D46] border-r-[#6a8035] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-start items-center p-4 font-sans pt-20">
      <Toaster />
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {/* Text-based logo instead of image */}
          
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2" style={{fontFamily: 'var(--font-lato)'}}>
            {showRegistration ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-gray-600" style={{fontFamily: 'var(--font-lato)'}}>
            {showRegistration 
              ? 'Register to become a customer and start shopping' 
              : 'Sign in to continue to your account'}
          </p>
        </div>
        
        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="pb-2">
            <div className="w-full h-1 bg-[#829D46] rounded-t-md"></div>
          </CardHeader>
          <CardContent className="pt-6 px-8">
            {!showRegistration ? (
              // Login Form
              <form onSubmit={handleLogin} className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/2 space-y-5">
                  <div className="space-y-2">
                    <Label 
                      htmlFor="username" 
                      className="text-sm font-medium text-gray-700"
                      style={{fontFamily: 'var(--font-lato)'}}
                    >
                      Username or Email
                    </Label>
                    <Input 
                      id="username" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-11 border-gray-300 focus:border-[#829D46] focus:ring-[#829D46]"
                      placeholder="Enter your username or email"
                      required
                      style={{fontFamily: 'var(--font-lato)'}}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label 
                      htmlFor="password" 
                      className="text-sm font-medium text-gray-700"
                      style={{fontFamily: 'var(--font-lato)'}}
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 border-gray-300 focus:border-[#829D46] focus:ring-[#829D46] pr-10"
                        placeholder="Enter your password"
                        required
                        style={{fontFamily: 'var(--font-lato)'}}
                      />
                      <button 
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                        onClick={togglePasswordVisibility}
                      >
                        {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 text-[#829D46] focus:ring-[#829D46] border-gray-300 rounded"
                      />
                      <label 
                        htmlFor="remember-me" 
                        className="ml-2 block text-sm text-gray-700"
                        style={{fontFamily: 'var(--font-lato)'}}
                      >
                        Remember me
                      </label>
                    </div>
                    <button 
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm font-medium text-[#829D46] hover:text-[#6a8035]"
                      style={{fontFamily: 'var(--font-lato)'}}
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
                
                <div className="w-full md:w-1/2 flex flex-col justify-between">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                      <span className="block sm:inline" style={{fontFamily: 'var(--font-lato)'}}>{error}</span>
                    </div>
                  )}
                  
                  <div className="flex flex-col space-y-6">
                    <p className="text-gray-500 italic text-sm" style={{fontFamily: 'var(--font-lato)'}}>
                      Sign in to access your account dashboard, manage orders, and view your product catalog.
                    </p>
                    
                    <Button 
                      type="submit"
                      className="w-full h-11 bg-[#829D46] hover:bg-[#6a8035] text-white font-medium rounded-md transition-all duration-200 ease-in-out transform hover:scale-[1.02]"
                      disabled={isLoading}
                      style={{fontFamily: 'var(--font-lato)'}}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Signing in...
                        </span>
                      ) : 'Sign In'}
                    </Button>
                    
                    <p className="text-sm text-center text-gray-600" style={{fontFamily: 'var(--font-lato)'}}>
                      Don't have an account? 
                      <button 
                        type="button"
                        onClick={toggleForm}
                        className="ml-1 font-medium text-[#829D46] hover:text-[#6a8035]"
                      >
                        Sign up
                      </button>
                    </p>
                  </div>
                </div>
              </form>
            ) : (
              // Registration Form
              <form onSubmit={handleRegistration} className="flex flex-col gap-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-2" role="alert">
                    <span className="block sm:inline" style={{fontFamily: 'var(--font-lato)'}}>{error}</span>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label 
                      htmlFor="email" 
                      className="text-sm font-medium text-gray-700"
                      style={{fontFamily: 'var(--font-lato)'}}
                    >
                      Email Address *
                    </Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 border-gray-300 focus:border-[#829D46] focus:ring-[#829D46]"
                      placeholder="Enter your email address"
                      required
                      style={{fontFamily: 'var(--font-lato)'}}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label 
                      htmlFor="firstName" 
                      className="text-sm font-medium text-gray-700"
                      style={{fontFamily: 'var(--font-lato)'}}
                    >
                      First Name
                    </Label>
                    <Input 
                      id="firstName" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-11 border-gray-300 focus:border-[#829D46] focus:ring-[#829D46]"
                      placeholder="Enter your first name"
                      style={{fontFamily: 'var(--font-lato)'}}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label 
                      htmlFor="lastName" 
                      className="text-sm font-medium text-gray-700"
                      style={{fontFamily: 'var(--font-lato)'}}
                    >
                      Last Name
                    </Label>
                    <Input 
                      id="lastName" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-11 border-gray-300 focus:border-[#829D46] focus:ring-[#829D46]"
                      placeholder="Enter your last name"
                      style={{fontFamily: 'var(--font-lato)'}}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label 
                      htmlFor="regPassword" 
                      className="text-sm font-medium text-gray-700"
                      style={{fontFamily: 'var(--font-lato)'}}
                    >
                      Password *
                    </Label>
                    <div className="relative">
                      <Input 
                        id="regPassword" 
                        type={showRegPassword ? "text" : "password"} 
                        value={regPassword} 
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="h-11 border-gray-300 focus:border-[#829D46] focus:ring-[#829D46] pr-10"
                        placeholder="Create a password"
                        required
                        style={{fontFamily: 'var(--font-lato)'}}
                      />
                      <button 
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                        onClick={toggleRegPasswordVisibility}
                      >
                        {showRegPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label 
                      htmlFor="confirmPassword" 
                      className="text-sm font-medium text-gray-700"
                      style={{fontFamily: 'var(--font-lato)'}}
                    >
                      Confirm Password *
                    </Label>
                    <Input 
                      id="confirmPassword" 
                      type="password"
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 border-gray-300 focus:border-[#829D46] focus:ring-[#829D46]"
                      placeholder="Confirm your password"
                      required
                      style={{fontFamily: 'var(--font-lato)'}}
                    />
                  </div>
                </div>
                
                <p className="text-sm text-gray-500 italic" style={{fontFamily: 'var(--font-lato)'}}>
                  By registering, you agree to our Terms of Service and Privacy Policy.
                </p>
                
                <div className="flex flex-col space-y-4">
                  <Button 
                    type="submit"
                    className="w-full h-11 bg-[#829D46] hover:bg-[#6a8035] text-white font-medium rounded-md transition-all duration-200 ease-in-out transform hover:scale-[1.02]"
                    disabled={registering}
                    style={{fontFamily: 'var(--font-lato)'}}
                  >
                    {registering ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Account...
                      </span>
                    ) : 'Create Account'}
                  </Button>
                  
                  <p className="text-sm text-center text-gray-600" style={{fontFamily: 'var(--font-lato)'}}>
                    Already have an account? 
                    <button 
                      type="button"
                      onClick={toggleForm}
                      className="ml-1 font-medium text-[#829D46] hover:text-[#6a8035]"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <div className="mt-8 w-full max-w-4xl">
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200 py-2 px-4">
              <h3 className="text-sm font-medium text-gray-700">Debug Information</h3>
            </CardHeader>
            <CardContent className="p-2 bg-white text-xs rounded overflow-auto max-h-48">
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
