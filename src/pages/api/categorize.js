// Server-side API endpoint for transaction categorization
// This would need to be deployed to Vercel with the GROQ_OCR_KEY environment variable

export default async function handler(req, res) {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get the transaction text from the request body
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Transaction text is required' });
    }

    // Get the GROQ API key from environment variables
    const groqApiKey = process.env.GROQ_OCR_KEY;
    if (!groqApiKey) {
      console.warn('GROQ API key not configured, falling back to basic categorization');
      return res.status(200).json(fallbackCategorization(text));
    }

    // Call Groq API for text analysis
    const groqResponse = await fetch('https://api.groq.com/v1/text-analysis', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        tasks: ['categorization', 'entity_extraction']
      })
    });

    if (!groqResponse.ok) {
      console.error('Groq API error:', await groqResponse.text());
      return res.status(200).json(fallbackCategorization(text));
    }

    const analysis = await groqResponse.json();

    // Map Groq categories to our application categories
    const categoryMapping = {
      'SHOPPING': 'Shopping',
      'GROCERY': 'Groceries',
      'FOOD': 'Dining',
      'RESTAURANT': 'Dining',
      'TRANSPORT': 'Transport',
      'UTILITY': 'Utilities',
      'BILL': 'Utilities',
      'HOUSING': 'Housing',
      'RENT': 'Housing',
      'ENTERTAINMENT': 'Entertainment',
      'TRANSFER': 'Transfer',
      'INCOME': 'Income',
      'SALARY': 'Income',
      'HEALTHCARE': 'Healthcare',
      'EDUCATION': 'Education',
      'TRAVEL': 'Travel',
      'SUBSCRIPTION': 'Subscription'
    };

    // Extract the category and confidence from Groq response
    const categories = analysis.categories || [];
    
    if (categories.length === 0) {
      return res.status(200).json(fallbackCategorization(text));
    }
    
    // Find the best matching category
    const groqCategory = categories[0].label.toUpperCase();
    const confidence = categories[0].confidence || 0.7;
    
    let category = 'Miscellaneous';
    let type = 'expense'; // Default type
    
    // Try to map the Groq category to our application category
    for (const [key, value] of Object.entries(categoryMapping)) {
      if (groqCategory.includes(key)) {
        category = value;
        break;
      }
    }
    
    // Determine transaction type based on category and entities
    if (category === 'Income' || category === 'Salary') {
      type = 'income';
    } else if (category === 'Transfer') {
      type = 'transfer';
    }
    
    // Further refine type based on entity extraction
    const entities = analysis.entities || [];
    const keywords = {
      income: ['received', 'income', 'salary', 'payment received', 'deposit'],
      expense: ['spent', 'paid', 'bought', 'purchased'],
      transfer: ['transfer', 'sent', 'moved']
    };
    
    // Check for specific entities or keywords in the text that might indicate the type
    const lowerText = text.toLowerCase();
    
    for (const [typeKey, typeKeywords] of Object.entries(keywords)) {
      for (const keyword of typeKeywords) {
        if (lowerText.includes(keyword)) {
          type = typeKey;
          break;
        }
      }
    }
    
    // Extract possible source and destination accounts for transfers
    let sourceAccount = '';
    let destinationAccount = '';
    
    if (type === 'transfer') {
      // Look for phrases like "from X to Y"
      const fromToMatch = text.match(/from\s+(.+?)\s+to\s+(.+?)(?:\s|$)/i);
      if (fromToMatch) {
        sourceAccount = fromToMatch[1].trim();
        destinationAccount = fromToMatch[2].trim();
      }
    }
    
    // Extract amount entity if available
    let extractedAmount = null;
    const amountEntities = entities.filter(e => e.type === 'MONEY' || e.type === 'NUMBER');
    if (amountEntities.length > 0) {
      const amountText = amountEntities[0].text;
      const numericMatch = amountText.match(/[\d,.]+/);
      if (numericMatch) {
        extractedAmount = numericMatch[0].replace(/,/g, '');
      }
    }
    
    // Get the possible alternative categories with lower confidence
    const possibleCategories = categories.map(cat => {
      const mappedName = Object.entries(categoryMapping).find(([key]) => 
        cat.label.toUpperCase().includes(key)
      );
      
      return {
        name: mappedName ? mappedName[1] : 'Miscellaneous',
        score: cat.confidence || 0.5
      };
    });
    
    // If we don't have enough alternative categories, add Miscellaneous
    if (possibleCategories.length < 2) {
      possibleCategories.push({
        name: 'Miscellaneous',
        score: 0.1
      });
    }

    // Return the results
    return res.status(200).json({
      success: true,
      category,
      type,
      confidence,
      possibleCategories,
      extractedAmount,
      sourceAccount,
      destinationAccount
    });
  } catch (error) {
    console.error('Categorization error:', error);
    return res.status(200).json(fallbackCategorization(text));
  }
}

// Fallback categorization when Groq API is not available
function fallbackCategorization(text) {
  // Simple categorization logic
  const categories = {
    'grocery': 'Groceries',
    'food': 'Dining',
    'restaurant': 'Dining',
    'cafe': 'Dining',
    'uber': 'Transport',
    'taxi': 'Transport',
    'bus': 'Transport',
    'electricity': 'Utilities',
    'water': 'Utilities',
    'internet': 'Utilities',
    'rent': 'Housing',
    'mortgage': 'Housing',
    'salary': 'Income',
    'payment received': 'Income',
    'transfer': 'Transfer'
  };
  
  let category = 'Miscellaneous';
  let type = 'expense'; // Default type
  const lowerText = text.toLowerCase();
  
  for (const [keyword, categoryName] of Object.entries(categories)) {
    if (lowerText.includes(keyword)) {
      category = categoryName;
      // Determine type based on category
      if (category === 'Income') {
        type = 'income';
      } else if (category === 'Transfer') {
        type = 'transfer';
      }
      break;
    }
  }
  
  // Extract source and destination for transfers
  let sourceAccount = '';
  let destinationAccount = '';
  
  if (type === 'transfer') {
    // Look for phrases like "from X to Y"
    const fromToMatch = text.match(/from\s+(.+?)\s+to\s+(.+?)(?:\s|$)/i);
    if (fromToMatch) {
      sourceAccount = fromToMatch[1].trim();
      destinationAccount = fromToMatch[2].trim();
    } else {
      // Default accounts
      sourceAccount = 'Main Account';
      destinationAccount = 'Savings';
    }
  }
  
  return {
    success: true,
    category,
    type,
    confidence: 0.7,
    possibleCategories: [
      { name: category, score: 0.7 },
      { name: 'Miscellaneous', score: 0.3 }
    ],
    sourceAccount,
    destinationAccount
  };
} 