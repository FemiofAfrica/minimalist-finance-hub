import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

app.use('/groq', createProxyMiddleware({
  target: 'https://api.groq.com',
  changeOrigin: true,
  pathRewrite: path => path.replace(/^\/groq/, ''),
  onProxyReq: (_, req) => console.log(`[groq-proxy] → ${req.method} ${req.url}`),
  onProxyRes: (proxyRes, req) => console.log(`[groq-proxy] ← ${proxyRes.statusCode} ${req.url}`)
}));

const PORT = process.env.GROQ_PROXY_PORT || 5005;
app.listen(PORT, () => console.log(`[groq-proxy] listening on http://localhost:${PORT}`)); 