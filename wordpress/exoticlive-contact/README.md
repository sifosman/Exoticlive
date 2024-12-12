# ExoticLive Contact Form Handler

This WordPress plugin handles contact form submissions from the Next.js frontend.

## Installation

1. Upload the `exoticlive-contact` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to Contact Form settings in the admin menu to configure the notification email

## Features

- Stores contact form submissions as a custom post type
- Sends email notifications using WordPress's wp_mail function
- Provides REST API endpoints for the Next.js frontend
- Secure authentication using WordPress REST API tokens

## Required Environment Variables

Add these to your Next.js `.env.local` file:

```
NEXT_PUBLIC_WORDPRESS_URL=your-wordpress-url
WP_AUTH_TOKEN=your-wordpress-auth-token
ADMIN_EMAIL=your-notification-email
```

## Security

The plugin uses WordPress's built-in authentication and capabilities system to ensure only authorized requests can submit forms and send emails.
