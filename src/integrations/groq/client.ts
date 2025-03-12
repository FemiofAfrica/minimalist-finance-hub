import { Groq } from 'groq-sdk';

// Initialize Groq client with API key
const apiKey = import.meta.env.VITE_GROQ_API_KEY;

if (!apiKey) {
  console.warn('VITE_GROQ_API_KEY is not configured, AI recommendations will not be available');
}

// Create Groq client only if API key is available
let groq: Groq | null = null;
try {
  if (apiKey) {
    groq = new Groq({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Allow usage in browser environment
    });
  }
} catch (error) {
  console.error('Failed to initialize Groq client:', error);
}

// Function to analyze user's financial goals and provide budget recommendations
export async function analyzeBudgetGoals({
  goalType,
  goalName,
  targetAmount,
  targetDate,
  monthlyIncome,
  transactions,
}: {
  goalType: string;
  goalName: string;
  targetAmount: number;
  targetDate: string;
  monthlyIncome: number;
  transactions: any[];
}) {
  // If API key is not configured or client initialization failed, return default response
  if (!apiKey || !groq) {
    console.warn('Groq API key not configured or client initialization failed, returning default response');
    return {
      success: false,
      error: 'AI recommendations are not available. Please check your API key configuration.',
      // Provide a default recommendation to ensure the app continues to work
      defaultRecommendation: true
    };
  }

  try {
    // Prepare the prompt for Groq
    const prompt = `Analyze the following financial information and provide budget recommendations:
      Goal Type: ${goalType}
      Goal Name: ${goalName}
      Target Amount: ${targetAmount}
      Target Date: ${targetDate}
      Monthly Income: ${monthlyIncome}
      Recent Transactions: ${JSON.stringify(transactions.slice(0, 10))} // Limit transactions to avoid payload size issues

      Based on this information, provide:
      1. A personalized budget allocation strategy
      2. Specific recommendations for achieving the financial goal
      3. Potential areas for expense optimization
    `;

    // Make API call to Groq with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('API request timed out')), 10000); // 10 second timeout
    });

    const apiPromise = groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a financial advisor specializing in personal budgeting and financial planning.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'mixtral-8x7b-32768',
      temperature: 0.7,
      max_tokens: 2048,
    });

    // Race between API call and timeout
    const completion = await Promise.race([apiPromise, timeoutPromise]) as Awaited<typeof apiPromise>;

    // Parse and structure the response
    const recommendation = completion.choices[0].message.content;
    return {
      success: true,
      recommendation,
    };
  } catch (error) {
    console.error('Error analyzing budget goals:', error);
    // Return a more detailed error message
    return {
      success: false,
      error: 'Failed to get AI recommendations. Using standard budget allocation.',
      defaultRecommendation: true
    };
  }
}