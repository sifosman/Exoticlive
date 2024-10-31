"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams?.get('orderId');
    if (id) {
      setOrderId(id);
    }
  }, [searchParams]);

  if (!orderId) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Order Success</h1>
      <p>Thank you for your order! Your order ID is: {orderId}</p>
    </div>
  );
}
