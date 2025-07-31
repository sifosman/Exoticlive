import { NextResponse } from "next/server";

// This endpoint validates coupons against WooCommerce API
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { couponCode, cartItems, subtotal } = body;

    if (!couponCode) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    // WooCommerce credentials
    const wooAuth = 'Basic ' + btoa('ck_266d630c64bfc03268cb471bdd86250b7a0b13f1:cs_d9da89b71742f6404027107dcc42b52926f7cb89');
    const wooCommerceUrl = 'https://wp.exoticshoes.co.za/wp-json/wc/v3';

    // Step 1: Check if coupon exists and is valid
    const couponResponse = await fetch(`${wooCommerceUrl}/coupons?code=${encodeURIComponent(couponCode)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': wooAuth
      }
    });

    const coupons = await couponResponse.json();

    // If no coupon found or coupon is invalid
    if (!couponResponse.ok || coupons.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid coupon code"
      }, { status: 400 });
    }

    const coupon = coupons[0];

    // Check if coupon is active
    if (!coupon.enabled) {
      return NextResponse.json({ 
        success: false, 
        message: "This coupon is not active"
      }, { status: 400 });
    }
    
    // Check if coupon has expired
    if (coupon.date_expires && new Date(coupon.date_expires) < new Date()) {
      return NextResponse.json({ 
        success: false, 
        message: "This coupon has expired"
      }, { status: 400 });
    }

    // Check minimum spend requirement
    if (coupon.minimum_amount && parseFloat(coupon.minimum_amount) > subtotal) {
      return NextResponse.json({ 
        success: false, 
        message: `A minimum spend of R${coupon.minimum_amount} is required to use this coupon`
      }, { status: 400 });
    }

    // Check maximum spend limit
    if (coupon.maximum_amount && parseFloat(coupon.maximum_amount) < subtotal) {
      return NextResponse.json({ 
        success: false, 
        message: `This coupon can only be used on orders under R${coupon.maximum_amount}`
      }, { status: 400 });
    }
    
    // Check usage limits
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return NextResponse.json({ 
        success: false, 
        message: "This coupon has reached its usage limit"
      }, { status: 400 });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discount_type === 'percent') {
      discountAmount = (subtotal * (parseFloat(coupon.amount) / 100));
    } else if (coupon.discount_type === 'fixed_cart') {
      discountAmount = parseFloat(coupon.amount);
    }

    // Apply per item discounts if needed (for fixed_product discount type)
    if (coupon.discount_type === 'fixed_product') {
      discountAmount = 0;
      for (const item of cartItems) {
        const discount = Math.min(parseFloat(coupon.amount), item.price);
        discountAmount += discount * item.quantity;
      }
    }

    // Ensure discount doesn't exceed the cart total
    discountAmount = Math.min(discountAmount, subtotal);

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discount_type,
        amount: parseFloat(coupon.amount),
        discountAmount: discountAmount
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to validate coupon"
    }, { status: 500 });
  }
}
