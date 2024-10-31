import { NextResponse } from 'next/server';

export async function GET() {
  // Replace this with actual user data fetching logic
  // You might want to use a session or JWT token to authenticate the request
  const userData = {
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    avatar_url: 'https://example.com/avatar.jpg',
  };

  return NextResponse.json(userData);
}
