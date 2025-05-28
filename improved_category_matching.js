// Improved category matching rules for parse-transaction-groq function
// Copy these rules into your Supabase Edge Function

// Updated pattern matching with better classification for personal care items
const improvedCategories = [
  { 
    name: "Groceries", 
    patterns: /(?:groceries|supermarket|food shopping|grocery store|foodstuff|market|provision)/i 
  },
  { 
    name: "Dining", 
    patterns: /(?:dinner|lunch|breakfast|restaurant|cafe|food|eat out|fast food|takeout|takeaway)/i 
  },
  { 
    name: "Salary", 
    patterns: /(?:salary|paycheck|wages|stipend|allowance|income)/i 
  },
  { 
    name: "Transport", 
    patterns: /(?:fuel|gas|transport|uber|taxi|bus|train|bolt|lagos ride|fare|transportation|flight|airline|car|vehicle|petrol)/i 
  },
  { 
    name: "Utilities", 
    patterns: /(?:utilities|electricity|water|gas bill|internet|data|airtime|recharge|top-up|bill|nep[ha]|ikedc|ekedc|dstv|cable|tv subscription|phone bill)/i 
  },
  { 
    name: "Entertainment", 
    patterns: /(?:movie|cinema|concert|show|game|entertainment|netflix|spotify|music|subscription|streaming|theater)/i 
  },
  { 
    name: "Shopping", 
    patterns: /(?:shopping|clothes|shoes|accessories|mall|amazon|jumia|konga|purchase|buy|bought)/i 
  },
  { 
    name: "Personal Care", 
    patterns: /(?:haircut|hair|barber|salon|spa|beauty|nail|manicure|pedicure|facial|massage|grooming|stylist|personal care)/i 
  },
  { 
    name: "Healthcare", 
    patterns: /(?:medical|doctor|hospital|pharmacy|healthcare|chemist|medicine|drug|prescription|clinic|treatment|therapy|consultation)/i 
  },
  { 
    name: "Education", 
    patterns: /(?:tuition|course|books|school fees|education|training|class|workshop|seminar|university|college|school)/i 
  },
  { 
    name: "Housing", 
    patterns: /(?:rent|mortgage|housing|accommodation|lease|apartment|flat|house payment|real estate|property)/i 
  },
  { 
    name: "Insurance", 
    patterns: /(?:insurance|premium|policy|coverage|protection plan)/i 
  },
  { 
    name: "Gift", 
    patterns: /(?:gift|present|donation|charity|contribution)/i 
  },
  { 
    name: "Transfer", 
    patterns: /(?:transfer|moved|sent|transaction|wire|remittance)/i 
  },
];

/*
IMPLEMENTATION INSTRUCTIONS:

1. Go to your Supabase dashboard
2. Navigate to Edge Functions
3. Open the "parse-transaction-groq" function
4. Find the categories array (around line 425-447)
5. Replace it with the improved categories array above
6. Deploy the updated function

This will ensure haircuts are properly categorized as "Personal Care" instead of "Shopping"
and provide more robust categorization for other transaction types.
*/ 