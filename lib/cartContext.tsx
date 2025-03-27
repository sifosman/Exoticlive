"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';

type CartItem = {
  id: string; // Ensure ID is a string
  variationId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variationName?: string | null;
  stockQuantity?: number; // Maximum available quantity
  stockStatus?: string; // Current stock status
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string, variationId?: string) => void; // Added variationId parameter
  updateQuantity: (id: string, quantity: number, variationId: string) => void;
  clearCart: () => void;
  cartCount: number; // Total items in cart
  cartTotal: number; // Total price of cart
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Calculate cart count and total
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  const addToCart = (item: CartItem) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (cartItem) => cartItem.id === item.id && cartItem.variationId === item.variationId
      );
      
      if (existingItemIndex !== -1) {
        const newCart = [...prevCart];
        const currentItem = newCart[existingItemIndex];
        
        // Check stock limits if stockQuantity is provided
        const stockLimit = currentItem.stockQuantity || Infinity;
        const newQuantity = currentItem.quantity + item.quantity;
        
        // Limit quantity to stock availability
        newCart[existingItemIndex].quantity = Math.min(newQuantity, stockLimit);
        return newCart;
      }
      
      return [...prevCart, { ...item }];
    });
  };

  const removeFromCart = (id: string, variationId: string = '') => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) => !(item.id === id && (variationId ? item.variationId === variationId : true))
      )
    );
  };

  const updateQuantity = (id: string, quantity: number, variationId: string) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === id && item.variationId === variationId) {
          // Enforce stock limits if available
          const stockLimit = item.stockQuantity || Infinity;
          const safeQuantity = Math.min(Math.max(1, quantity), stockLimit);
          
          return { ...item, quantity: safeQuantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
