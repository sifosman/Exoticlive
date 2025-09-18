"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess(true);
        toast({
          title: "Email Sent",
          description: "If an account exists with this email, you will receive password reset instructions.",
          className: "bg-[#829D46] text-white",
        });
      } else {
        // For security reasons, we still show a success message even if the email doesn't exist
        // This prevents user enumeration attacks
        setSuccess(true);
        toast({
          title: "Email Sent",
          description: "If an account exists with this email, you will receive password reset instructions.",
          className: "bg-[#829D46] text-white",
        });
        
        // Log the actual error for debugging
        console.error('Password reset error:', data.error);
      }
    } catch (error) {
      console.error('Error requesting password reset:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-start items-center p-4 font-sans pt-20">
      <Toaster />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2" style={{fontFamily: 'var(--font-lato)'}}>
            Reset Password
          </h1>
          <p className="text-gray-600" style={{fontFamily: 'var(--font-lato)'}}>
            {!success 
              ? "Enter your email address and we'll send you a link to reset your password" 
              : "Check your email for password reset instructions"}
          </p>
        </div>
        
        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="pb-2">
            <div className="w-full h-1 bg-[#829D46] rounded-t-md"></div>
          </CardHeader>
          <CardContent className="pt-6 px-8">
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
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
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 border-gray-300 focus:border-[#829D46] focus:ring-[#829D46]"
                    placeholder="Enter your email address"
                    required
                    style={{fontFamily: 'var(--font-lato)'}}
                  />
                </div>
                
                <div className="space-y-4">
                  <Button 
                    type="submit"
                    className="w-full h-11 bg-[#829D46] hover:bg-[#6a8035] text-white font-medium rounded-md transition-all duration-200 ease-in-out transform hover:scale-[1.02]"
                    disabled={isSubmitting}
                    style={{fontFamily: 'var(--font-lato)'}}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </span>
                    ) : 'Send Reset Link'}
                  </Button>
                  
                  <p className="text-sm text-center text-gray-600" style={{fontFamily: 'var(--font-lato)'}}>
                    Remember your password? 
                    <button 
                      type="button"
                      onClick={handleReturnToLogin}
                      className="ml-1 font-medium text-[#829D46] hover:text-[#6a8035]"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              <div className="space-y-6 py-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-[#829D46]/10 p-3">
                    <svg className="h-8 w-8 text-[#829D46]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-medium text-gray-900" style={{fontFamily: 'var(--font-lato)'}}>
                    Check your email
                  </h3>
                  <p className="text-sm text-gray-500" style={{fontFamily: 'var(--font-lato)'}}>
                    We've sent a password reset link to <span className="font-medium">{email}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-4" style={{fontFamily: 'var(--font-lato)'}}>
                    Don't see the email? Check your spam folder.
                  </p>
                </div>
                
                <Button 
                  type="button"
                  className="w-full h-11 bg-[#829D46] hover:bg-[#6a8035] text-white font-medium rounded-md transition-all duration-200 ease-in-out"
                  onClick={handleReturnToLogin}
                  style={{fontFamily: 'var(--font-lato)'}}
                >
                  Return to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
