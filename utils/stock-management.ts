// utils/stock-management.ts
/**
 * Utility functions for stock management
 */

/**
 * Update product stock in WooCommerce via our API
 * @param productId - The WooCommerce product ID
 * @param variationId - Optional variation ID for variable products
 * @param quantity - New stock quantity
 * @param orderReference - Optional order reference for tracking
 */
export async function updateProductStock(
  productId: string | number,
  quantity: number,
  variationId?: string | number | null,
  orderReference?: string | null
) {
  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_SITE_URL}api/orders/update-stock`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId,
        variationId,
        quantity,
        orderReference,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update stock: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw error;
  }
}

/**
 * Process stock updates for a completed order
 * @param orderItems - Array of items in the order
 * @param orderReference - Order reference for tracking
 */
export async function processOrderStockUpdates(
  orderItems: Array<{
    productId: string | number;
    variationId?: string | number | null;
    quantity: number;
    currentStock?: number;
  }>,
  orderReference?: string
) {
  try {
    const stockUpdatePromises = orderItems.map(item => {
      // Calculate new stock quantity (current stock minus purchased quantity)
      const newQuantity = typeof item.currentStock === 'number' 
        ? Math.max(0, item.currentStock - item.quantity) 
        : 0;
      
      return updateProductStock(
        item.productId,
        newQuantity,
        item.variationId,
        orderReference
      );
    });

    const results = await Promise.all(stockUpdatePromises);
    return results;
  } catch (error) {
    console.error('Error processing order stock updates:', error);
    throw error;
  }
}
