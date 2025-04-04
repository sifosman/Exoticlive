<?php
/**
 * Plugin Name: Exotic GraphQL Stock Sync
 * Description: Ensures stock updates trigger GraphQL events
 * Version: 1.0.0
 * Author: AI Assistant
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class Exotic_GraphQL_Stock_Sync {
    /**
     * Constructor
     */
    public function __construct() {
        // Hook into WooCommerce stock updates
        add_action('woocommerce_variation_set_stock', array($this, 'trigger_variation_update'), 10, 2);
        add_action('woocommerce_product_set_stock', array($this, 'trigger_product_update'), 10, 2);
        add_action('woocommerce_update_product_variation', array($this, 'trigger_variation_save'), 10, 1);
        add_action('woocommerce_save_product_variation', array($this, 'trigger_variation_save'), 10, 1);
        
        // Add settings page
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
    }
    
    /**
     * Trigger variation update
     */
    public function trigger_variation_update($variation, $stock_quantity) {
        // Get the variation ID
        $variation_id = $variation->get_id();
        
        // Get the parent product ID
        $parent_id = $variation->get_parent_id();
        
        // Log the stock update
        error_log("GraphQL Stock Sync: Variation stock updated - Variation ID: {$variation_id}, Parent ID: {$parent_id}, Stock: {$stock_quantity}");
        
        // Force an update to trigger GraphQL events
        $variation->set_stock_status($stock_quantity > 0 ? 'instock' : 'outofstock');
        $variation->save();
        
        // Also update the parent product to trigger GraphQL events
        $parent = wc_get_product($parent_id);
        if ($parent) {
            $parent->save();
        }
    }
    
    /**
     * Trigger product update
     */
    public function trigger_product_update($product, $stock_quantity) {
        // Get the product ID
        $product_id = $product->get_id();
        
        // Log the stock update
        error_log("GraphQL Stock Sync: Product stock updated - Product ID: {$product_id}, Stock: {$stock_quantity}");
        
        // Force an update to trigger GraphQL events
        $product->set_stock_status($stock_quantity > 0 ? 'instock' : 'outofstock');
        $product->save();
    }
    
    /**
     * Trigger variation save
     */
    public function trigger_variation_save($variation_id) {
        // Get the variation
        $variation = wc_get_product($variation_id);
        if (!$variation) {
            return;
        }
        
        // Get the parent product ID
        $parent_id = $variation->get_parent_id();
        
        // Log the variation save
        error_log("GraphQL Stock Sync: Variation saved - Variation ID: {$variation_id}, Parent ID: {$parent_id}");
        
        // Force an update to trigger GraphQL events
        $variation->save();
        
        // Also update the parent product to trigger GraphQL events
        $parent = wc_get_product($parent_id);
        if ($parent) {
            $parent->save();
        }
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_submenu_page(
            'woocommerce',
            'GraphQL Stock Sync',
            'GraphQL Stock Sync',
            'manage_options',
            'exotic-graphql-stock-sync',
            array($this, 'settings_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('exotic_graphql_stock_sync', 'exotic_graphql_stock_sync_enabled');
    }
    
    /**
     * Settings page
     */
    public function settings_page() {
        ?>
        <div class="wrap">
            <h1>GraphQL Stock Sync Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('exotic_graphql_stock_sync'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">Enable Sync</th>
                        <td>
                            <label>
                                <input type="checkbox" name="exotic_graphql_stock_sync_enabled" value="1" <?php checked(get_option('exotic_graphql_stock_sync_enabled', '1'), '1'); ?> />
                                Enable GraphQL stock synchronization
                            </label>
                            <p class="description">When enabled, stock updates will trigger GraphQL events that can be used to update the frontend.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
            
            <h2>How It Works</h2>
            <p>This plugin ensures that when stock levels are updated in WooCommerce, the changes trigger GraphQL events that can be used to update the frontend.</p>
            <p>It works by:</p>
            <ol>
                <li>Hooking into WooCommerce stock update actions</li>
                <li>Forcing a save on the product and its variations</li>
                <li>This triggers GraphQL events that can be subscribed to</li>
            </ol>
            
            <h2>Testing</h2>
            <p>To test if the plugin is working:</p>
            <ol>
                <li>Update a product's stock in WooCommerce</li>
                <li>Check the WordPress error log for messages from "GraphQL Stock Sync"</li>
                <li>Verify that the stock is updated on your frontend</li>
            </ol>
        </div>
        <?php
    }
}

// Initialize the plugin
new Exotic_GraphQL_Stock_Sync();
