const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    // Serve the reset-onboarding.html file
    const filePath = path.join(__dirname, 'reset-onboarding.html');
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end(`Error loading the page: ${err.message}`);
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content, 'utf-8');
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Reset page available at: http://localhost:${PORT}`);
  console.log(`Open this URL in your browser to reset the onboarding state.`);
}); 