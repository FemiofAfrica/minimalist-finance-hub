// A simple proxy server to handle CORS issues during local development
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:5173', 'https://www.kpege.com'],
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Info', 'apikey']
}));

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Add a test route to verify the server is running
app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Proxy server is running' });
});

// Serve the test HTML file
app.get('/', (req, res) => {
  res.sendFile('test-edge-function.html', { root: '.' });
});

// Direct request handler for the parse-transaction-groq endpoint
app.post('/direct-test', express.json(), async (req, res) => {
  try {
    console.log('Received direct test request with body:', req.body);
    
    // Use a dummy authorization header for development
    const requestBody = JSON.stringify(req.body);
    console.log('Request body (stringified):', requestBody);
    
    // Build the complete URL for better debugging
    const url = 'http://localhost:54321/functions/v1/parse-transaction-groq';
    console.log('Sending request to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-token-for-development',
      },
      body: requestBody
    });
    
    console.log('Direct test response status:', response.status);
    console.log('Direct test response headers:', Object.fromEntries(response.headers));
    
    let responseContent;
    try {
      responseContent = await response.text();
      console.log('Raw response content:', responseContent);
      
      // Try to parse as JSON if possible
      if (responseContent.trim().startsWith('{') || responseContent.trim().startsWith('[')) {
        const jsonData = JSON.parse(responseContent);
        console.log('Parsed JSON response:', jsonData);
        res.json(jsonData);
      } else {
        res.status(response.status).send(responseContent);
      }
    } catch (error) {
      console.error('Error processing response:', error);
      res.status(response.status).send(responseContent || 'Error processing response');
    }
  } catch (error) {
    console.error('Error in direct test:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy requests to Supabase Edge Functions
app.use('/functions', createProxyMiddleware({
  target: 'http://localhost:54321',
  changeOrigin: true,
  pathRewrite: (path) => {
    const newPath = path.replace(/^\/functions/, '/functions/v1');
    console.log(`Rewriting path: ${path} -> ${newPath}`);
    return newPath;
  },
  onProxyReq: (proxyReq, req, res) => {
    // Log the complete URL being proxied
    const fullUrl = `${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`;
    console.log(`Proxying ${req.method} request to: ${fullUrl}`);
    
    // Log request headers
    console.log('Request headers:', req.headers);
    
    // If this is a POST request with a body, log it
    if (req.method === 'POST' && req.body) {
      const bodyStr = JSON.stringify(req.body);
      console.log('Request body:', bodyStr);
      
      // Make sure the Content-Length header is set correctly
      if (bodyStr) {
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyStr));
      }
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Received ${proxyRes.statusCode} response from Supabase for ${req.method} ${req.url}`);
    
    // Add CORS headers to the response
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || 'https://www.kpege.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info, apikey');
    
    // Log response headers
    console.log('Response headers:', proxyRes.headers);
  }
}));

// Catch 404 and forward to error handler
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not Found', path: req.url });
});

app.listen(port, () => {
  console.log(`Dev proxy server running at http://localhost:${port}`);
  console.log(`Use http://localhost:${port}/functions/parse-transaction-groq to access your Edge Function`);
  console.log(`Test the server with: curl http://localhost:${port}/test`);
}); 