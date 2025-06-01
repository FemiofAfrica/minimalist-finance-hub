// Vercel serverless function for transaction categorization based on working groq-api-proxy logic

export default async function handler(req, res) {
  // Add CORS headers for production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Received categorization request');

  try {
    // Get the transaction text from the request body
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Transaction text is required' });
    }

    console.log('Categorizing text:', text);

    // Get the GROQ API key from environment variables
    const groqApiKey = process.env.GROQ_API_KEY || process.env.GROQ_OCR_KEY;
    if (!groqApiKey) {
      console.warn('GROQ API key not configured, falling back to basic categorization');
      return res.status(200).json(fallbackCategorization(text));
    }

    try {
      // Call Groq API for text analysis (same logic as groq-api-proxy)
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          messages: [
            {
              role: "system", 
              content: "You are a helpful assistant that categorizes financial transactions. Analyze the text and return a JSON object with these fields: category (one of: Shopping, Groceries, Dining, Transport, Utilities, Housing, Entertainment, Transfer, Income, Healthcare, Education, Travel, or Subscription), category_type (expense, income, or transfer), amount (extracted number), category_name (same as category). If it's a transfer, also include source_account and destination_account."
            },
            {
              role: "user",
              content: `Categorize this transaction: "${text}"`
            }
          ],
          temperature: 0.0
        })
      });
      
      if (!groqResponse.ok) {
        throw new Error(`Groq API returned ${groqResponse.status}: ${await groqResponse.text()}`);
      }
      
      const analysis = await groqResponse.json();
      console.log('Groq analysis received');
      
      // Extract structured data from the LLM response
      const assistantResponse = analysis.choices[0].message.content;
      console.log('Assistant response:', assistantResponse);
      
      // Try to parse JSON response first (same logic as groq-api-proxy)
      let parsedData;
      try {
        // First, try to extract JSON from markdown code blocks
        let jsonString = assistantResponse;
        
        // Look for JSON wrapped in markdown code blocks
        const codeBlockMatch = assistantResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
        if (codeBlockMatch) {
          jsonString = codeBlockMatch[1];
          console.log('Extracted JSON from code block:', jsonString);
        } else {
          // Look for JSON object without code blocks
          const jsonMatch = assistantResponse.match(/(\{[\s\S]*?\})/);
          if (jsonMatch) {
            jsonString = jsonMatch[1];
            console.log('Extracted JSON from response:', jsonString);
          }
        }
        
        parsedData = JSON.parse(jsonString);
        console.log('Successfully parsed JSON:', parsedData);
      } catch (jsonError) {
        // If JSON parsing fails, extract data manually
        console.log('JSON parsing failed, extracting manually');
        
        // Extract category
        let category = 'Miscellaneous';
        const categoryMatch = assistantResponse.match(/categor(y|ize):\s*"?([A-Za-z]+)"?/i);
        if (categoryMatch) {
          category = categoryMatch[2];
        }
        
        // Extract type
        let category_type = 'expense';
        if (assistantResponse.toLowerCase().includes('income')) {
          category_type = 'income';
        } else if (assistantResponse.toLowerCase().includes('transfer')) {
          category_type = 'transfer';
        }
        
        // Extract source and destination accounts for transfers
        let source_account = '';
        let destination_account = '';
        if (category_type === 'transfer') {
          const sourceMatch = assistantResponse.match(/source(?:\s+account)?:\s*([^,\n.]+)/i);
          if (sourceMatch) {
            source_account = sourceMatch[1].trim();
          }
          
          const destinationMatch = assistantResponse.match(/destination(?:\s+account)?:\s*([^,\n.]+)/i);
          if (destinationMatch) {
            destination_account = destinationMatch[1].trim();
          }
        }
        
        // Extract amount if present
        let amount = null;
        const amountMatch = assistantResponse.match(/amount:\s*([0-9,.]+)/i) || text.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);
        if (amountMatch) {
          amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        }
        
        parsedData = {
          category,
          category_name: category,
          category_type,
          amount,
          source_account,
          destination_account
        };
      }
      
      return res.status(200).json({
        success: true,
        category: parsedData.category || parsedData.category_name || 'Miscellaneous',
        category_name: parsedData.category_name || parsedData.category || 'Miscellaneous',
        category_type: parsedData.category_type || 'expense',
        amount: parsedData.amount,
        confidence: 0.9,
        possibleCategories: [
          { name: parsedData.category || 'Miscellaneous', score: 0.9 },
          { name: 'Miscellaneous', score: 0.1 }
        ],
        extractedAmount: parsedData.amount,
        source_account: parsedData.source_account || '',
        destination_account: parsedData.destination_account || ''
      });
      
    } catch (error) {
      console.error('Error calling Groq API:', error);
      console.log('Using fallback categorization for:', text);
      return res.status(200).json(fallbackCategorization(text));
    }
  } catch (error) {
    console.error('Categorization error:', error);
    return res.status(500).json({ error: 'Failed to categorize transaction' });
  }
}

// Fallback categorization function (same logic as groq-api-proxy)
function fallbackCategorization(text) {
  console.log('Using fallback categorization for:', text);
  // Simple categorization logic
  const categories = {
    'grocery': 'Groceries',
    'groceries': 'Groceries',
    'supermarket': 'Groceries',
    'store': 'Groceries',
    'food': 'Groceries',
    'restaurant': 'Dining',
    'cafe': 'Dining',
    'pizza': 'Dining',
    'burger': 'Dining',
    'uber': 'Transport',
    'taxi': 'Transport',
    'bus': 'Transport',
    'transport': 'Transport',
    'electricity': 'Utilities',
    'water': 'Utilities',
    'internet': 'Utilities',
    'rent': 'Housing',
    'mortgage': 'Housing',
    'salary': 'Income',
    'payment received': 'Income',
    'received': 'Income',
    'income': 'Income',
    'transfer': 'Transfer',
    'sent': 'Transfer',
    'gas': 'Transport',
    'fuel': 'Transport'
  };
  
  let category = 'Miscellaneous';
  let category_type = 'expense'; // Default type
  const lowerText = text.toLowerCase();
  
  // Check for keywords in the text
  for (const [keyword, categoryName] of Object.entries(categories)) {
    if (lowerText.includes(keyword)) {
      category = categoryName;
      // Determine type based on category
      if (category === 'Income') {
        category_type = 'income';
      } else if (category === 'Transfer') {
        category_type = 'transfer';
      }
      break;
    }
  }
  
  // Extract amount from text
  let amount = null;
  const amountMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }
  
  // Extract source and destination for transfers
  let source_account = '';
  let destination_account = '';
  
  if (category_type === 'transfer') {
    // Look for phrases like "from X to Y"
    const fromToMatch = text.match(/from\s+(.+?)\s+to\s+(.+?)(?:\s|$)/i);
    if (fromToMatch) {
      source_account = fromToMatch[1].trim();
      destination_account = fromToMatch[2].trim();
    } else {
      // Default accounts
      source_account = 'Main Account';
      destination_account = 'Savings';
    }
  }
  
  return {
    success: true,
    category,
    category_name: category,
    category_type,
    amount,
    confidence: 0.7,
    possibleCategories: [
      { name: category, score: 0.7 },
      { name: 'Miscellaneous', score: 0.3 }
    ],
    extractedAmount: amount,
    source_account,
    destination_account
  };
} 