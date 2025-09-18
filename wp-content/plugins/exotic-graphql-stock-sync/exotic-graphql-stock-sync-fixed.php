<?php
/**
 * Plugin Name: Exotic GraphQL Stock Sync (Fixed)
 * Description: Ensures stock updates trigger GraphQL events without causing WooCommerce to hang
 * Version: 1.1.0
 * Author: AI Assistant
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class Exotic_GraphQL_Stock_Sync_Fixed {
    // Flag to prevent infinite loops
    private $is_processing = false;
    
    /**
     * Constructor
     */
    public function __construct() {
        // Only hook into WooCommerce if the plugin is enabled
        if (get_option('exotic_graphql_stock_sync_enabled', '1') === '1') {
            // Hook into WooCommerce stock updates with lower priority to ensure we run after WooCommerce
            add_action('woocommerce_variation_set_stock', array($this, 'log_variation_stock_update'), 20, 2);
            add_action('woocommerce_product_set_stock', array($this, 'log_product_stock_update'), 20, 2);
            
            // Hook into product and variation save actions with very low priority
            add_action('woocommerce_update_product', array($this, 'trigger_graphql_update'), 999, 1);
            add_action('woocommerce_update_product_variation', array($this, 'trigger_graphql_update'), 999, 1);
            
            // Add a custom action to manually trigger a sync
            add_action('wp_ajax_exotic_graphql_sync_product', array($this, 'ajax_sync_product'));
        }
        
        // Add settings page
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        
        // Add sync button to product edit page
        add_action('woocommerce_product_options_inventory_product_data', array($this, 'add_sync_button'));
        add_action('admin_footer', array($this, 'add_sync_script'));
    }
    
    /**
     * Log variation stock update without triggering additional saves
     */
    public function log_variation_stock_update($variation, $stock_quantity) {
        // Get the variation ID
        $variation_id = $variation->get_id();
        
        // Get the parent product ID
        $parent_id = $variation->get_parent_id();
        
        // Log the stock update
        error_log("GraphQL Stock Sync: Variation stock updated - Variation ID: {$variation_id}, Parent ID: {$parent_id}, Stock: {$stock_quantity}");
    }
    
    /**
     * Log product stock update without triggering additional saves
     */
    public function log_product_stock_update($product, $stock_quantity) {
        // Get the product ID
        $product_id = $product->get_id();
        
        // Log the stock update
        error_log("GraphQL Stock Sync: Product stock updated - Product ID: {$product_id}, Stock: {$stock_quantity}");
    }
    
    /**
     * Trigger GraphQL update without causing infinite loops
     */
    public function trigger_graphql_update($product_id) {
        // Prevent infinite loops
        if ($this->is_processing) {
            return;
        }
        
        $this->is_processing = true;
        
        try {
            // Get the product
            $product = wc_get_product($product_id);
            
            if (!$product) {
                return;
            }
            
            // Log the update
            error_log("GraphQL Stock Sync: Triggering GraphQL update for product {$product_id}");
            
            // Check if this is a variation
            if ($product->is_type('variation')) {
                // Get the parent product ID
                $parent_id = $product->get_parent_id();
                error_log("GraphQL Stock Sync: Product {$product_id} is a variation of {$parent_id}");
                
                // Trigger a custom action that GraphQL can hook into
                do_action('exotic_graphql_variation_updated', $product_id, $parent_id);
            } else {
                // Trigger a custom action that GraphQL can hook into
                do_action('exotic_graphql_product_updated', $product_id);
            }
        } finally {
            // Reset the processing flag
            $this->is_processing = false;
        }
    }
    
    /**
     * AJAX handler for manual sync
     */
    public function ajax_sync_product() {
        // Check nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'exotic_graphql_sync')) {
            wp_send_json_error('Invalid nonce');
            return;
        }
        
        // Check product ID
        if (!isset($_POST['product_id']) || empty($_POST['product_id'])) {
            wp_send_json_error('Product ID is required');
            return;
        }
        
        $product_id = intval($_POST['product_id']);
        
        // Trigger GraphQL update
        $this->trigger_graphql_update($product_id);
        
        // Get the product
        $product = wc_get_product($product_id);
        
        if ($product && $product->is_type('variable')) {
            // Get variations
            $variations = $product->get_children();
            
            if (!empty($variations)) {
                foreach ($variations as $variation_id) {
                    $this->trigger_graphql_update($variation_id);
                }
                
                wp_send_json_success("Synced product {$product_id} and " . count($variations) . " variations");
                return;
            }
        }
        
        wp_send_json_success("Synced product {$product_id}");
    }
    
    /**
     * Add sync button to product edit page
     */
    public function add_sync_button() {
        global $post;
        
        if (!$post) {
            return;
        }
        
        echo '<div class="options_group">';
        echo '<p class="form-field">';
        echo '<label>GraphQL Sync</label>';
        echo '<button type="button" class="button exotic-graphql-sync-button" data-product-id="' . esc_attr($post->ID) . '">Sync to Frontend</button>';
        echo '<span class="description">Manually sync this product to the frontend</span>';
        echo '</p>';
        echo '</div>';
    }
    
    /**
     * Add JavaScript for sync button
     */
    public function add_sync_script() {
        ?>
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            $('.exotic-graphql-sync-button').on('click', function(e) {
                e.preventDefault();
                
                var button = $(this);
                var productId = button.data('product-id');
                
                button.prop('disabled', true).text('Syncing...');
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'exotic_graphql_sync_product',
                        product_id: productId,
                        nonce: '<?php echo wp_create_nonce('exotic_graphql_sync'); ?>'
                    },
                    success: function(response) {
                        if (response.success) {
                            button.text('Synced!');
                            setTimeout(function() {
                                button.prop('disabled', false).text('Sync to Frontend');
                            }, 2000);
                        } else {
                            button.text('Error');
                            alert('Error: ' + response.data);
                            setTimeout(function() {
                                button.prop('disabled', false).text('Sync to Frontend');
                            }, 2000);
                        }
                    },
                    error: function() {
                        button.text('Error');
                        alert('An error occurred while syncing the product.');
                        setTimeout(function() {
                            button.prop('disabled', false).text('Sync to Frontend');
                        }, 2000);
                    }
                });
            });
        });
        </script>
        <?php
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
                <li>Triggering custom actions that GraphQL can hook into</li>
                <li>Providing a manual sync button on the product edit page</li>
            </ol>
            
            <h2>Manual Sync</h2>
            <p>You can manually sync a product to the frontend by clicking the "Sync to Frontend" button on the product edit page.</p>
            
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
new Exotic_GraphQL_Stock_Sync_Fixed();
