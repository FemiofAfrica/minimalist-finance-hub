# Deployment Guide

## Prerequisites

- Node.js (v18 or higher)
- A server with SSH access
- Domain name (optional)
  - For temporary access: Server's IP address or free hosting service (Netlify/Vercel)
- Supabase account with a production project

## Environment Setup

1. Create a production `.env` file based on `.env.example`:

```bash
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key
```

## Building the Application

1. Install dependencies:
```bash
npm install
```

2. Build the production version:
```bash
npm run build
```

This will create a `dist` directory with the production-ready files.

## Server Setup

### Using Nginx

1. Install Nginx:
```bash
sudo apt update
sudo apt install nginx
```

2. Create an Nginx configuration file:
```nginx
# Option 1: IP-based access
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/minimalist-finance-hub/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";

    # Optional: IP-based access restriction
    # Uncomment and modify to restrict access to specific IPs
    #allow 192.168.1.0/24;  # Allow your local network
    #allow 203.0.113.0/24;  # Allow specific external IPs
    #deny all;             # Deny all other IPs
}

# Option 2: Subdomain-based access (when using services like Netlify/Vercel)
server {
    listen 80;
    server_name your-temp-subdomain.netlify.app;

    root /var/www/minimalist-finance-hub/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
}
```

3. Deploy the built files:
```bash
scp -r dist/* user@your-server:/var/www/minimalist-finance-hub/dist/
```

## Temporary Hosting Options

### Option 1: IP-Based Access

1. Access your application using the server's IP address:
   ```
   http://your-server-ip
   ```

2. For added security, configure IP-based access restrictions in the Nginx configuration.

### Option 2: Free Hosting Services

1. Deploy to Netlify:
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Deploy to Netlify
   netlify deploy
   ```

2. Deploy to Vercel:
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Deploy to Vercel
   vercel
   ```

## SSL Setup (When Using Domain)

1. Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
```

2. Obtain SSL certificate:
```bash
sudo certbot --nginx -d your-domain.com
```

## Beta Testing Access

1. Configure authentication in Supabase:
   - Go to Authentication settings in your Supabase dashboard
   - Enable Email/Password and Social providers as needed
   - Add beta tester email domains to allowed list

2. Invite beta testers:
   - Share the production URL
   - Provide test account credentials or invite links

## Monitoring

1. Set up error tracking:
   - Monitor Supabase logs for backend issues
   - Use browser console logs for frontend issues
   - Consider adding error reporting service

2. Gather feedback:
   - Create a feedback form or system
   - Monitor user sessions and interactions

## Continuous Deployment (Optional)

1. Set up GitHub Actions:
   - Create `.github/workflows/deploy.yml`
   - Configure automatic builds and deployments
   - Set up environment secrets

## Troubleshooting

- Check Nginx error logs: `/var/log/nginx/error.log`
- Verify environment variables are properly set
- Ensure Supabase connection is working
- Check browser console for frontend errors

## Rollback Procedure

1. Keep backup of previous deployment
2. Store previous environment configurations
3. Document database migration states

## Security Considerations

- Keep environment variables secure
- Regularly update dependencies
- Monitor for suspicious activities
- Implement rate limiting
- Use secure headers

For any issues or questions, please refer to the project documentation or create an issue in the repository.