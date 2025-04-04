<?php
/**
 * Plugin Name: Exotic Stock Sync
 * Description: Synchronizes stock updates between WooCommerce and Typesense
 * Version: 1.0.0
 * Author: AI Assistant
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class Exotic_Stock_Sync {
    /**
     * Constructor
     */
    public function __construct() {
        // Hook into WooCommerce stock updates
        add_action('woocommerce_variation_set_stock', array($this, 'sync_variation_stock'), 10, 2);
        add_action('woocommerce_product_set_stock', array($this, 'sync_product_stock'), 10, 2);
        
        // Add settings page
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
    }
    
    /**
     * Sync variation stock
     */
    public function sync_variation_stock($variation, $stock_quantity) {
        // Get the parent product ID
        $parent_id = $variation->get_parent_id();
        $variation_id = $variation->get_id();
        
        // Log the stock update
        error_log("Variation stock updated: Parent ID: {$parent_id}, Variation ID: {$variation_id}, Stock: {$stock_quantity}");
        
        // Sync with Typesense
        $this->sync_with_typesense($parent_id, $variation_id, $stock_quantity);
    }
    
    /**
     * Sync product stock
     */
    public function sync_product_stock($product, $stock_quantity) {
        // Only sync simple products (variations are handled by sync_variation_stock)
        if ($product->is_type('simple')) {
            $product_id = $product->get_id();
            
            // Log the stock update
            error_log("Simple product stock updated: Product ID: {$product_id}, Stock: {$stock_quantity}");
            
            // Sync with Typesense (for simple products, parent_id and variation_id are the same)
            $this->sync_with_typesense($product_id, $product_id, $stock_quantity);
        }
    }
    
    /**
     * Sync with Typesense
     */
    private function sync_with_typesense($parent_id, $variation_id, $stock_quantity) {
        // Get the API URL from settings
        $api_url = get_option('exotic_stock_sync_api_url', '');
        
        if (empty($api_url)) {
            error_log("Exotic Stock Sync: API URL not configured");
            return;
        }
        
        // Prepare the request
        $args = array(
            'body' => json_encode(array(
                'parentProductId' => (int) $parent_id,
                'variationId' => (int) $variation_id,
                'stockQuantity' => (int) $stock_quantity
            )),
            'headers' => array(
                'Content-Type' => 'application/json'
            ),
            'timeout' => 30
        );
        
        // Send the request
        $response = wp_remote_post($api_url, $args);
        
        // Check for errors
        if (is_wp_error($response)) {
            error_log("Exotic Stock Sync: Error syncing stock: " . $response->get_error_message());
            return;
        }
        
        // Parse the response
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        // Log the result
        if (isset($data['success']) && $data['success']) {
            error_log("Exotic Stock Sync: Stock synced successfully");
        } else {
            error_log("Exotic Stock Sync: Error syncing stock: " . (isset($data['message']) ? $data['message'] : 'Unknown error'));
        }
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_submenu_page(
            'woocommerce',
            'Stock Sync Settings',
            'Stock Sync',
            'manage_options',
            'exotic-stock-sync',
            array($this, 'settings_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('exotic_stock_sync', 'exotic_stock_sync_api_url');
    }
    
    /**
     * Settings page
     */
    public function settings_page() {
        ?>
        <div class="wrap">
            <h1>Stock Sync Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('exotic_stock_sync'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">API URL</th>
                        <td>
                            <input type="text" name="exotic_stock_sync_api_url" value="<?php echo esc_attr(get_option('exotic_stock_sync_api_url', '')); ?>" class="regular-text" />
                            <p class="description">Enter the URL of your stock update API (e.g., https://exoticshoes.co.za/api/stock/update)</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
}

// Initialize the plugin
new Exotic_Stock_Sync();
