import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { ArrowLeft, Share, Calendar, Clock, Tag } from 'lucide-react';
import NavBar from "@/components/ui/NavBar";

const KpegeCompleteGuide = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('kpege-auth-token');
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  // Set document title for SEO
  useEffect(() => {
    document.title = "Everything You Can Do with Kpege: Complete Personal Finance Guide | Kpege Blog";
    
    // Add meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 
        'Discover all of Kpege\'s AI-powered features for personal finance management: natural language expense tracking, receipt scanning, global currency support, and upcoming features like predictive budgeting.'
      );
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Discover all of Kpege\'s AI-powered features for personal finance management: natural language expense tracking, receipt scanning, global currency support, and upcoming features like predictive budgeting.';
      document.head.appendChild(meta);
    }

    return () => {
      document.title = 'Kpege - Personal Finance Management Made Simple';
    };
  }, []);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Everything You Can Do with Kpege: Complete Personal Finance Guide',
          text: 'Discover how Kpege transforms personal finance management with AI-powered features.',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Share failed:', error);
      }
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Article URL copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-[#e8f1df]">
      {/* Header/Navigation */}
      <NavBar 
        isAuthenticated={isAuthenticated}
        showFeatures={false}
      />

      {/* Article Content */}
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb Navigation */}
          <nav className="mb-6">
            <Link 
              to="/blog" 
              className="inline-flex items-center text-sm text-muted-foreground hover:text-green-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Link>
          </nav>

          {/* Article */}
          <article className="bg-white rounded-lg shadow-sm">
            <div className="p-6 md:p-8">
              <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                  Everything You Can Do with Kpege: Your Complete Personal Finance Management Guide
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <time dateTime="2025-06-05">June 5, 2025</time>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>5 min read</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    <span>Product Guide</span>
                  </div>
                  <button 
                    onClick={handleShare}
                    className="flex items-center gap-1 text-green-700 hover:text-green-800 transition-colors"
                  >
                    <Share className="h-4 w-4" />
                    Share
                  </button>
                </div>
                
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                  Discover how Kpege transforms personal finance management through AI-powered expense tracking, 
                  natural language processing, and intelligent financial insights—plus what's coming next.
                </p>
              </header>

              <div className="prose prose-lg max-w-none">
                <p>
                  Managing personal finances doesn't have to be a chore. Kpege brings together cutting-edge 
                  AI technology and intuitive design to make expense tracking as simple as having a conversation 
                  about money. Here's everything you can do with Kpege today, and what exciting features are 
                  coming soon.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-green-700">🚀 What You Can Do Right Now</h2>

                <h3 className="text-xl font-semibold mt-6 mb-3">Smart Expense Tracking with Natural Language</h3>
                <p>
                  Say goodbye to complex forms. Simply type or speak naturally: <em>"Spent $25 on lunch at 
                  the coffee shop yesterday"</em> or <em>"Paid 50k naira for rent last Monday."</em> Kpege's 
                  AI understands context, extracts amounts, categorizes expenses, and even handles relative 
                  dates like "yesterday" or "last week."
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">AI-Powered Receipt Scanning</h3>
                <p>
                  Snap a photo of any receipt, and Kpege automatically extracts transaction details, amounts, 
                  merchant names, and categories. No more manual data entry—just point, shoot, and save.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">Global Currency Support</h3>
                <p>
                  Whether you're tracking Nigerian Naira, US Dollars, British Pounds, or any of 40+ supported 
                  currencies, Kpege adapts to your local context. Live currency conversion helps you understand 
                  spending across different currencies effortlessly.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">Intelligent Categorization</h3>
                <p>
                  Kpege automatically categorizes your expenses into meaningful groups like Transport, Dining, 
                  Groceries, and Utilities. The AI learns from context clues in your descriptions to ensure 
                  accurate classification without manual intervention.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">Real-Time Financial Dashboard</h3>
                <p>
                  Get a complete overview of your financial health with interactive charts, spending trends, 
                  and category breakdowns. See where your money goes and identify patterns in your spending habits.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">Cross-Platform Accessibility</h3>
                <p>
                  Access Kpege from any device—desktop, tablet, or mobile. Your financial data syncs 
                  seamlessly, so you can track expenses on the go and review insights at home.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-green-700">🔮 Coming Soon: The Future of Finance</h2>

                <h3 className="text-xl font-semibold mt-6 mb-3">Predictive Budget Planning</h3>
                <p>
                  Advanced AI algorithms will analyze your spending patterns to predict future expenses 
                  and suggest optimal budget allocations. Never be caught off-guard by recurring costs again.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">Smart Subscription Management</h3>
                <p>
                  Automatic detection and tracking of recurring subscriptions with alerts for upcoming 
                  renewals, usage optimization suggestions, and cost-saving recommendations.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">Financial Goal Setting & Tracking</h3>
                <p>
                  Set and monitor savings goals with personalized milestone tracking and automated 
                  recommendations to help you reach your financial objectives faster.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">Bank Integration & Sync</h3>
                <p>
                  Secure connections to major banks and financial institutions for automatic transaction 
                  import, ensuring your records are always complete and up-to-date.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">Collaborative Family Budgeting</h3>
                <p>
                  Share budgets and expenses with family members, set spending limits for different 
                  family members, and track joint financial goals together.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-green-700">🎯 Why Choose Kpege?</h2>

                <p>
                  <strong>Simplicity First:</strong> We believe financial management should be intuitive, 
                  not intimidating. Kpege removes barriers between you and your money insights.
                </p>

                <p>
                  <strong>AI-Powered Intelligence:</strong> Our advanced AI doesn't just store data—it 
                  understands context, learns from your habits, and provides actionable insights.
                </p>

                <p>
                  <strong>Global Perspective:</strong> Built for users worldwide, Kpege works with your 
                  local currency and understands regional financial contexts.
                </p>

                <p>
                  <strong>Privacy & Security:</strong> Your financial data is protected with bank-level 
                  security and transparent privacy practices. Your money insights belong to you.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-green-700">🚀 Ready to Transform Your Finances?</h2>

                <p>
                  Whether you're looking to gain better visibility into your spending, simplify expense 
                  tracking, or prepare for future financial goals, Kpege provides the tools and insights 
                  you need. Start with our free version today and experience the future of personal 
                  finance management.
                </p>

                <div className="bg-green-50 p-6 rounded-lg mt-8 border border-green-200">
                  <h3 className="text-lg font-semibold mb-2 text-green-800">Get Started in Under 2 Minutes</h3>
                  <p className="text-green-700 mb-4">
                    Join thousands of users who've already simplified their financial lives with Kpege.
                  </p>
                  <Link to="/login">
                    <Button className="bg-green-700 hover:bg-green-800 text-white">
                      Start Tracking Your Expenses Now →
                    </Button>
                  </Link>
                </div>
              </div>

              <footer className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full">
                    #PersonalFinance
                  </span>
                  <span className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full">
                    #ExpenseTracking
                  </span>
                  <span className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full">
                    #AI
                  </span>
                  <span className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full">
                    #BudgetingApp
                  </span>
                  <span className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full">
                    #FinTech
                  </span>
                </div>
                
                <div className="text-center">
                  <Link to="/blog">
                    <Button variant="outline" className="hover:border-green-700 hover:text-green-700">
                      ← Back to All Articles
                    </Button>
                  </Link>
                </div>
              </footer>
            </div>
          </article>

          {/* Related Articles */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-6">More Articles Coming Soon</h2>
            <Card className="p-6">
              <p className="text-muted-foreground">
                We're working on more helpful content about budgeting strategies, saving tips, 
                and personal finance best practices. Check back soon!
              </p>
            </Card>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 md:py-10 bg-slate-900 text-slate-300">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-6 md:mb-0">
              <img src="/kpege-logo-light.svg" alt="Kpege" className="h-6 md:h-8 mb-2 md:mb-3" />
              <p className="max-w-xs text-xs md:text-sm text-slate-400 leading-relaxed">
                Making financial management simple and effortless.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
              <div>
                <h4 className="font-bold mb-2 md:mb-3 text-xs md:text-sm">Product</h4>
                <ul className="space-y-1 md:space-y-1.5">
                  <li><Link to="/" className="text-xs hover:text-white transition-colors">Features</Link></li>
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Security</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold mb-2 md:mb-3 text-xs md:text-sm">Company</h4>
                <ul className="space-y-1 md:space-y-1.5">
                  <li><Link to="/about" className="text-xs hover:text-white transition-colors">About</Link></li>
                  <li><Link to="/blog" className="text-xs hover:text-white transition-colors">Blog</Link></li>
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Careers</a></li>
                </ul>
              </div>
              
              <div className="col-span-2 md:col-span-1">
                <h4 className="font-bold mb-2 md:mb-3 text-xs md:text-sm">Resources</h4>
                <ul className="space-y-1 md:space-y-1.5">
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Help Center</a></li>
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Contact</a></li>
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Privacy</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-6 md:mt-8 pt-4 md:pt-6 flex flex-col md:flex-row justify-between items-center border-t border-slate-800">
            <p className="text-xs">© 2025 Kpege. All rights reserved.</p>
            <div className="flex space-x-4 mt-3 md:mt-0">
              <a href="https://x.com/usekpege" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <svg className="h-4 w-4 md:h-5 md:w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path>
                </svg>
              </a>
              <a href="https://www.instagram.com/usekpege" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <svg className="h-4 w-4 md:h-5 md:w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.40z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default KpegeCompleteGuide; 