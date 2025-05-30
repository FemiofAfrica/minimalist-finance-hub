// A simplified proxy server that directly forwards requests to the Edge Function
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Serve the test HTML file
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'test-edge-function.html'));
});

// Add a test route to verify the server is running
app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Proxy server is running' });
});

// Helper function to categorize transactions based on description/narration
function categorizeTransaction(text) {
  if (!text) return { category: "Uncategorized", type: "EXPENSE" };
  
  const lowerText = text.toLowerCase();
  
  // Transport category
  if (lowerText.includes("bus") || 
      lowerText.includes("taxi") || 
      lowerText.includes("uber") || 
      lowerText.includes("bolt") || 
      lowerText.includes("ride") || 
      lowerText.includes("train") || 
      lowerText.includes("transport") || 
      lowerText.includes("fare") || 
      lowerText.includes("fuel") || 
      lowerText.includes("petrol") || 
      lowerText.includes("flight") || 
      lowerText.includes("airfare")) {
    return { category: "Transport", type: "EXPENSE" };
  }
  
  // Utilities category
  if (lowerText.includes("water") || 
      lowerText.includes("electricity") || 
      lowerText.includes("power") || 
      lowerText.includes("gas") || 
      lowerText.includes("internet") || 
      lowerText.includes("wifi") || 
      lowerText.includes("bill") || 
      lowerText.includes("utility")) {
    return { category: "Utilities", type: "EXPENSE" };
  }
  
  // Food/Dining category
  if (lowerText.includes("food") || 
      lowerText.includes("restaurant") || 
      lowerText.includes("cafe") || 
      lowerText.includes("meal") || 
      lowerText.includes("lunch") || 
      lowerText.includes("dinner") || 
      lowerText.includes("breakfast")) {
    return { category: "Dining", type: "EXPENSE" };
  }
  
  // Groceries category
  if (lowerText.includes("grocery") || 
      lowerText.includes("supermarket") || 
      lowerText.includes("market") || 
      lowerText.includes("store") || 
      lowerText.includes("shopping")) {
    return { category: "Groceries", type: "EXPENSE" };
  }
  
  // Income category
  if (lowerText.includes("salary") || 
      lowerText.includes("wage") || 
      lowerText.includes("income") || 
      lowerText.includes("payment received") || 
      lowerText.includes("deposit")) {
    return { category: "Salary", type: "INCOME" };
  }
  
  // Transfer category
  if (lowerText.includes("transfer") || 
      lowerText.includes("sent") || 
      lowerText.includes("remittance")) {
    return { category: "Transfer", type: "TRANSFER" };
  }
  
  // Default
  return { category: "Uncategorized", type: "EXPENSE" };
}

// Local fallback parser function (simplified version of the Edge Function)
function parseFallback(text) {
  try {
    console.log("Parsing with local fallback implementation:", text);
    
    // Default transaction data
    const result = {
      description: "Unknown Transaction",
      amount: 0,
      category_name: "Uncategorized",
      category_type: "EXPENSE",
      date: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
    };
    
    const lowerText = text.toLowerCase();
    
    // Extract amount - look for common money patterns
    const amountMatch = text.match(/([0-9,.]+k)|([0-9,.]+)/i);
    if (amountMatch) {
      let amount = amountMatch[0];
      // Handle 'k' notation (e.g., 5k = 5000)
      if (amount.toLowerCase().includes('k')) {
        amount = parseFloat(amount.toLowerCase().replace('k', '')) * 1000;
      } else {
        amount = parseFloat(amount.replace(/,/g, ''));
      }
      if (!isNaN(amount)) {
        result.amount = amount;
      }
    }
    
    // Set description based on input text
    if (text.length > 0) {
      // If it's a long text, truncate it
      result.description = text.length > 50 ? text.substring(0, 47) + '...' : text;
    }
    
    // Check if this looks like a transfer
    const isTransfer = /sent|transfer|to [a-z]+ for|to [a-z]+$/i.test(text);
    
    if (isTransfer) {
      result.is_transfer = true;
      result.category_type = "TRANSFER";
      result.category_name = "Transfer";
      
      // Try to extract recipient
      const recipientMatch = text.match(/(?:to|for) ([a-z\s]+)(?:for|$)/i);
      if (recipientMatch && recipientMatch[1]) {
        const recipient = recipientMatch[1].trim();
        if (recipient) {
          result.destination_account = recipient;
          // Update description to include recipient
          result.description = `Transfer to ${recipient}`;
        }
      }
    } else {
      // Use the categorization helper
      const categorization = categorizeTransaction(text);
      result.category_name = categorization.category;
      result.category_type = categorization.type;
    }
    
    console.log("Local parser result:", result);
    return result;
  } catch (error) {
    console.error("Error in local parser:", error);
    return {
      description: "Error parsing transaction",
      amount: 0,
      category_name: "Uncategorized",
      category_type: "EXPENSE"
    };
  }
}

// Simple direct endpoint that tries to use the Edge Function but falls back to local implementation
app.post('/parse-transaction', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        error: 'Missing text parameter',
        message: 'Please provide a transaction text to parse' 
      });
    }
    
    console.log('Processing transaction parsing request:', { text });
    
    // First try to call the actual Edge Function
    try {
      console.log('Attempting to call Edge Function...');
      
      const response = await fetch('http://localhost:54321/functions/v1/parse-transaction-groq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy-token-for-development'
        },
        body: JSON.stringify(req.body)
      });
      
      if (response.ok) {
        console.log('Edge Function call successful!');
        const data = await response.json();
        return res.json(data);
      }
      
      console.log('Edge Function returned status:', response.status);
      // If we get here, the Edge Function call failed
      throw new Error(`Edge Function returned status ${response.status}`);
    } catch (edgeFunctionError) {
      // Log the error and fall back to local implementation
      console.log('Edge Function call failed, using local fallback:', edgeFunctionError.message);
      
      // Use our local implementation
      const result = parseFallback(text);
      return res.json(result);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ 
      error: 'Failed to process transaction',
      message: error.message
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Simple proxy server running at http://localhost:${port}`);
  console.log(`Use http://localhost:${port}/parse-transaction to access your Edge Function`);
}); 