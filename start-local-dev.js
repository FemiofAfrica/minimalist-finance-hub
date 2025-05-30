// Script to start the local transaction parser for development
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the super simple proxy script
const proxyScriptPath = path.join(__dirname, 'super-simple-proxy.js');

// Function to check if a port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    
    server.listen(port);
  });
}

// Function to open the test page in the default browser
function openBrowser(url) {
  let command;
  const args = [];
  
  switch (process.platform) {
    case 'darwin': // macOS
      command = 'open';
      break;
    case 'win32': // Windows
      command = 'start';
      args.push('""'); // This prevents issues with spaces in the path
      break;
    default: // Linux and others
      command = 'xdg-open';
      break;
  }
  
  args.push(url);
  spawn(command, args, { shell: true });
}

// Main function to start everything
async function main() {
  console.log('Starting local development environment...');
  
  // Check if port 3000 is available
  const portInUse = await isPortInUse(3000);
  
  if (portInUse) {
    console.log('Port 3000 is already in use. The local parser might already be running.');
    console.log('If you need to restart it, run: pkill -f "node super-simple-proxy.js"');
  } else {
    console.log('Starting local transaction parser on port 3000...');
    
    // Start the local parser
    const parserProcess = spawn('node', [proxyScriptPath], {
      stdio: 'inherit',
      detached: true
    });
    
    // Unref the process to allow this script to exit
    parserProcess.unref();
    
    console.log('Local parser started! (Process ID:', parserProcess.pid, ')');
  }
  
  // Wait a moment for the server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Open the test page in the browser
  console.log('Opening test page in browser...');
  openBrowser('http://localhost:3000/test');
  
  console.log('\nSetup complete!');
  console.log('- Transaction parser is running at: http://localhost:3000/parse-transaction');
  console.log('- Test interface is available at: http://localhost:3000/test');
  console.log('- Health check endpoint: http://localhost:3000/health');
  console.log('\nTo stop the parser, run: pkill -f "node super-simple-proxy.js"');
}

// Run the main function
main().catch(err => {
  console.error('Error starting local environment:', err);
  process.exit(1);
}); 