import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
// Prefer local env file for dev proxy
dotenv.config({ path: '.env.development.local' });
dotenv.config(); // fallback to default .env if present

// Resolve dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// JSON body parser – safe because multipart/form-data bypasses it
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper to lazily import serverless handler files
function handlerFor(file) {
  return async (req, res, next) => {
    try {
      const modulePath = path.join(__dirname, 'api', file);
      const mod = await import(modulePath);
      if (!mod?.default || typeof mod.default !== 'function') {
        throw new Error(`Handler ${file} does not export a default function`);
      }
      return mod.default(req, res);
    } catch (err) {
      console.error(`dev-proxy error in ${file}:`, err);
      next(err);
    }
  };
}

// OPTIONS pre-flight for all /api routes
app.options(/^\/api\//, (req, res) => res.status(200).end());

// Register individual handlers
app.post('/api/categorize', handlerFor('categorize.js'));
app.post('/api/ocr', handlerFor('ocr.js'));

// Fallback 404 for other routes
app.all(/^\/api\//, (req, res) => res.status(404).json({ error: 'Not Found' }));

const PORT = process.env.API_PORT || 4000;
app.listen(PORT, () => console.log(`[dev-proxy] listening on http://localhost:${PORT}`)); 