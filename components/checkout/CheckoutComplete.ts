// Example implementation for checkout completion
import { processOrderStockUpdates } from '@/utils/stock-management';

// Call this function after successful payment processing
export async function handleSuccessfulCheckout(orderData: any) {
  try {
    // Extract order items from your cart/order data
    const orderItems = orderData.items.map((item: any) => ({
      productId: item.product_id,
      variationId: item.variation_id || null,
      quantity: item.quantity,
      currentStock: item.stock_quantity
    }));

    // Generate a unique order reference
    const orderReference = `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Update stock levels in WooCommerce and Typesense
    await processOrderStockUpdates(orderItems, orderReference);

    console.log('Stock updated successfully for order:', orderReference);
    
    return true;
  } catch (error) {
    console.error('Failed to update stock after checkout:', error);
    // Don't fail the checkout process if stock update fails
    // Just log the error and continue
    return true;
  }
}
