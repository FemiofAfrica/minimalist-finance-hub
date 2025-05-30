// Ultra-simple transaction parser server with minimal dependencies
import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const port = 3000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Request body:', req.body);
  next();
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is healthy' });
});

// Helper function to generate a better description
function generateDescription(text, category, type) {
  // If context_narration is provided, we'll use that instead
  // This function generates a description when none is provided
  
  const lowerText = text.toLowerCase();
  
  // Income descriptions
  if (type === 'INCOME') {
    if (lowerText.includes('salary')) return 'Salary Payment';
    if (lowerText.includes('bonus')) return 'Bonus Payment';
    if (lowerText.includes('refund')) return 'Refund';
    if (lowerText.includes('dividend')) return 'Dividend Income';
    if (lowerText.includes('interest')) return 'Interest Income';
    if (lowerText.includes('client') || lowerText.includes('customer')) return 'Client Payment';
    return 'Income Received';
  }
  
  // Transfer descriptions are handled separately in the main function
  
  // Expense descriptions based on category
  if (category === 'Dining') {
    // Check for restaurant name first
    const restaurantMatch = text.match(/at\s+([A-Za-z\s']+)/i);
    const restaurantName = restaurantMatch && restaurantMatch[1] ? restaurantMatch[1].trim() : null;
    
    if (lowerText.includes('lunch')) {
      return restaurantName ? `Lunch at ${restaurantName}` : 'Lunch';
    }
    if (lowerText.includes('dinner')) {
      return restaurantName ? `Dinner at ${restaurantName}` : 'Dinner';
    }
    if (lowerText.includes('breakfast')) {
      return restaurantName ? `Breakfast at ${restaurantName}` : 'Breakfast';
    }
    if (lowerText.includes('restaurant') && restaurantName) {
      return `Meal at ${restaurantName}`;
    }
    return 'Dining Expense';
  }
  
  if (category === 'Transport') {
    if (lowerText.includes('uber')) return 'Uber Ride';
    if (lowerText.includes('taxi')) return 'Taxi Fare';
    if (lowerText.includes('bus')) return 'Bus Fare';
    if (lowerText.includes('train')) return 'Train Ticket';
    if (lowerText.includes('fuel') || lowerText.includes('petrol')) return 'Fuel Purchase';
    return 'Transport Expense';
  }
  
  if (category === 'Utilities') {
    if (lowerText.includes('electricity')) return 'Electricity Bill';
    if (lowerText.includes('water')) return 'Water Bill';
    if (lowerText.includes('internet')) return 'Internet Bill';
    if (lowerText.includes('phone')) return 'Phone Bill';
    return 'Utility Bill';
  }
  
  if (category === 'Personal Care') {
    if (lowerText.includes('haircut')) return 'Haircut';
    return 'Personal Care Expense';
  }
  
  // Generic approach - try to extract the essential information
  // Remove common filler phrases
  let cleanText = lowerText
    .replace(/i (sent|paid|got|received|spent)/, '')
    .replace(/(this|that|the) (morning|afternoon|evening|night)/, '')
    .replace(/for my/, '')
    .replace(/an? (expense|income|transfer) (of|for)/, '')
    .trim();
  
  // Capitalize first letter
  if (cleanText.length > 0) {
    cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
    
    // If it's still too long, truncate it
    if (cleanText.length > 40) {
      cleanText = cleanText.substring(0, 37) + '...';
    }
    
    return cleanText;
  }
  
  // Fallback to category-based description
  return `${category} ${type === 'INCOME' ? 'Income' : 'Expense'}`;
}

// Local transaction parsing endpoint
app.post('/parse-transaction', (req, res) => {
  try {
    const { text, context_amount, context_date, context_narration } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Missing text parameter' });
    }
    
    console.log('Parsing transaction:', { text, context_amount, context_date, context_narration });
    
    // Set initial category information
    let categoryName = 'Uncategorized';
    let categoryType = 'EXPENSE';
    let isTransfer = false;
    let destinationAccount = null;
    
    // Determine if this is a transfer
    const transferMatch = text.toLowerCase().match(/sent|transfer|to [a-z]+ for|to [a-z]+$/i);
    if (transferMatch) {
      isTransfer = true;
      categoryName = 'Transfer';
      categoryType = 'TRANSFER';
      
      // Try to extract recipient
      const recipientMatch = text.match(/(?:to|for) ([a-z\s]+)(?:for|$)/i);
      if (recipientMatch && recipientMatch[1]) {
        destinationAccount = recipientMatch[1].trim();
      }
    } else {
      // Categorize based on keywords
      if (text.toLowerCase().includes('haircut') || text.toLowerCase().includes('barber')) {
        categoryName = 'Personal Care';
      } else if (text.toLowerCase().includes('food') || text.toLowerCase().includes('restaurant') || 
                 text.toLowerCase().includes('lunch') || text.toLowerCase().includes('dinner')) {
        categoryName = 'Dining';
      } else if (text.toLowerCase().includes('uber') || text.toLowerCase().includes('taxi') || 
                 text.toLowerCase().includes('bus') || text.toLowerCase().includes('transport')) {
        categoryName = 'Transport';
      } else if (text.toLowerCase().includes('electricity') || text.toLowerCase().includes('water') || 
                 text.toLowerCase().includes('utility') || text.toLowerCase().includes('bill')) {
        categoryName = 'Utilities';
      } else if (text.toLowerCase().includes('salary') || text.toLowerCase().includes('income') || 
                 text.toLowerCase().includes('received') || text.toLowerCase().includes('got')) {
        categoryName = 'Salary';
        categoryType = 'INCOME';
      }
    }
    
    // Generate the appropriate description
    let description;
    if (context_narration) {
      // If explicit narration is provided, use it
      description = context_narration;
    } else if (isTransfer && destinationAccount) {
      // For transfers, create a description with the destination
      description = `Transfer to ${destinationAccount}`;
    } else {
      // Otherwise, use our smart description generator
      description = generateDescription(text, categoryName, categoryType);
    }
    
    // Build the final result
    const result = {
      description: description,
      amount: context_amount || extractAmount(text),
      category_name: categoryName,
      category_type: categoryType,
      date: context_date || new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    };
    
    // Add transfer-specific fields if needed
    if (isTransfer) {
      result.is_transfer = true;
      if (destinationAccount) {
        result.destination_account = destinationAccount;
      }
    }
    
    console.log('Parsing result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error parsing transaction:', error);
    res.status(500).json({ error: 'Failed to parse transaction', message: error.message });
  }
});

// Helper function to extract amount from text
function extractAmount(text) {
  try {
    // Match patterns like 5k, 5,000, 5000
    const match = text.match(/(\d+(?:,\d+)*(?:\.\d+)?k?)/i);
    if (!match) return 0;
    
    let amount = match[0];
    
    // Handle 'k' notation (e.g., 5k = 5000)
    if (amount.toLowerCase().includes('k')) {
      amount = parseFloat(amount.toLowerCase().replace('k', '')) * 1000;
    } else {
      // Remove commas and parse
      amount = parseFloat(amount.replace(/,/g, ''));
    }
    
    return isNaN(amount) ? 0 : amount;
  } catch (error) {
    console.error('Error extracting amount:', error);
    return 0;
  }
}

// Serve the test HTML file at /test rather than the root
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-edge-function.html'));
});

// Don't serve anything at the root to avoid conflict with the main app
app.get('/', (req, res) => {
  res.send(`
    <html>
    <head><title>Local Parser</title></head>
    <body>
      <h1>Local Transaction Parser</h1>
      <p>The parser is running and available at <a href="/parse-transaction">/parse-transaction</a>.</p>
      <p>For a test interface, visit <a href="/test">/test</a>.</p>
      <p>To check health, visit <a href="/health">/health</a>.</p>
    </body>
    </html>
  `);
});

// Start server
app.listen(port, () => {
  console.log(`Super-simple parser running at http://localhost:${port}`);
  console.log(`Try: curl -X POST -H "Content-Type: application/json" -d '{"text":"I sent 5k to Abdul for my haircut"}' http://localhost:${port}/parse-transaction`);
}); 