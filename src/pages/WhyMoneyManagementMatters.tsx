import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { ArrowLeft, Share, Calendar, Clock, Tag, TrendingUp, Shield, Target, Heart, AlertTriangle, CheckCircle } from 'lucide-react';
import NavBar from "@/components/ui/NavBar";

const WhyMoneyManagementMatters = () => {
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
    document.title = "Why Managing Your Money is Important: The Complete Guide to Financial Wellness | Kpege Blog";
    
    // Add meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 
        'Discover why money management is crucial for financial wellness, stress reduction, and achieving your life goals. Learn practical tips to start managing your finances effectively today.'
      );
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Discover why money management is crucial for financial wellness, stress reduction, and achieving your life goals. Learn practical tips to start managing your finances effectively today.';
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
          title: 'Why Managing Your Money is Important: The Complete Guide to Financial Wellness',
          text: 'Discover why money management is crucial for financial wellness and achieving your life goals.',
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
                  Why Managing Your Money is Important: The Complete Guide to Financial Wellness
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <time dateTime="2025-06-06">June 6, 2025</time>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>6 min read</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    <span>Financial Education</span>
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
                  Money management isn't just about tracking expenses—it's about creating the life you want, 
                  reducing stress, and building a secure future. Discover why effective financial management 
                  is one of the most important skills you can develop.
                </p>
              </header>

              <div className="prose prose-lg max-w-none">
                <p>
                  In today's world, money touches every aspect of our lives. Yet many people struggle with 
                  financial management, leading to stress, missed opportunities, and unfulfilled dreams. 
                  Understanding why money management matters—and taking action—can transform not just your 
                  bank account, but your entire quality of life.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-green-700 flex items-center">
                  <Heart className="h-6 w-6 mr-2" />
                  The Life-Changing Benefits of Good Money Management
                </h2>

                <h3 className="text-xl font-semibold mt-6 mb-3">1. Reduced Financial Stress and Anxiety</h3>
                <p>
                  Financial worries are one of the leading causes of stress worldwide. When you manage your 
                  money effectively, you gain clarity about your financial position, eliminate the fear of 
                  the unknown, and sleep better at night knowing you're in control. Studies show that people 
                  with organized finances report 40% lower stress levels than those without financial plans.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">2. Freedom to Pursue Your Dreams</h3>
                <p>
                  Whether it's starting a business, traveling the world, buying a home, or changing careers, 
                  good money management gives you the freedom to make choices based on your values rather 
                  than financial constraints. When you have a clear picture of your finances, you can make 
                  strategic decisions that align with your life goals.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">3. Protection Against Life's Uncertainties</h3>
                <p>
                  Life is unpredictable. Job loss, medical emergencies, or unexpected expenses can derail 
                  anyone's financial stability. Effective money management includes building emergency funds 
                  and creating financial buffers that protect you and your family during challenging times.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">4. Improved Relationships and Family Harmony</h3>
                <p>
                  Money conflicts are a leading cause of relationship stress and divorce. When you manage 
                  money well, you reduce financial arguments, improve communication with your partner, and 
                  create a more harmonious family environment. Financial transparency and planning strengthen 
                  relationships rather than strain them.
                </p>

                <div className="bg-red-50 p-6 rounded-lg mt-8 border border-red-200">
                  <h3 className="text-lg font-semibold mb-3 text-red-800 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    The Cost of Poor Money Management
                  </h3>
                  <ul className="text-red-700 space-y-2">
                    <li>• Living paycheck to paycheck, even with a good income</li>
                    <li>• Accumulating high-interest debt that compounds over time</li>
                    <li>• Missing out on investment opportunities and compound growth</li>
                    <li>• Constant financial stress affecting health and relationships</li>
                    <li>• Limited life choices due to financial constraints</li>
                    <li>• Inadequate preparation for retirement or emergencies</li>
                  </ul>
                </div>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-green-700 flex items-center">
                  <TrendingUp className="h-6 w-6 mr-2" />
                  The Financial Habits That Transform Lives
                </h2>

                <h3 className="text-xl font-semibold mt-6 mb-3">Track Every Dollar</h3>
                <p>
                  You can't manage what you don't measure. Successful money managers know exactly where 
                  their money goes each month. This awareness alone often leads to significant savings as 
                  people identify and eliminate wasteful spending patterns they never realized existed.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">Create and Follow a Budget</h3>
                <p>
                  A budget isn't about restriction—it's about intention. It's a plan that ensures your 
                  money serves your priorities and values. People who budget regularly save 15% more than 
                  those who don't, according to financial research.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">Build Multiple Financial Safety Nets</h3>
                <p>
                  Emergency funds, insurance, and diversified investments create layers of protection 
                  against financial shocks. These safety nets provide peace of mind and prevent small 
                  financial setbacks from becoming major crises.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">Invest in Your Future Self</h3>
                <p>
                  Regular investing, even in small amounts, harnesses the power of compound growth. 
                  Starting early makes an enormous difference—someone who invests $200 monthly starting 
                  at age 25 will have significantly more wealth at retirement than someone who starts 
                  at 35, even if the later starter contributes more per month.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-green-700 flex items-center">
                  <Shield className="h-6 w-6 mr-2" />
                  Common Money Management Mistakes to Avoid
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <Card className="p-4 border-l-4 border-red-500">
                    <h4 className="font-semibold text-red-800 mb-2">The "I'll Start Tomorrow" Trap</h4>
                    <p className="text-sm text-red-700">
                      Waiting for the "perfect time" to start managing money. The best time to start 
                      was yesterday; the second best time is now.
                    </p>
                  </Card>
                  
                  <Card className="p-4 border-l-4 border-red-500">
                    <h4 className="font-semibold text-red-800 mb-2">Ignoring Small Expenses</h4>
                    <p className="text-sm text-red-700">
                      Thinking that small purchases don't matter. A $5 daily coffee habit costs 
                      $1,825 per year—money that could be invested or saved.
                    </p>
                  </Card>
                  
                  <Card className="p-4 border-l-4 border-red-500">
                    <h4 className="font-semibold text-red-800 mb-2">No Emergency Fund</h4>
                    <p className="text-sm text-red-700">
                      Living without financial cushions means any unexpected expense becomes a crisis 
                      that leads to debt or financial stress.
                    </p>
                  </Card>
                  
                  <Card className="p-4 border-l-4 border-red-500">
                    <h4 className="font-semibold text-red-800 mb-2">Lifestyle Inflation</h4>
                    <p className="text-sm text-red-700">
                      Automatically increasing spending as income rises, preventing wealth building 
                      and maintaining the paycheck-to-paycheck cycle.
                    </p>
                  </Card>
                </div>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-green-700 flex items-center">
                  <Target className="h-6 w-6 mr-2" />
                  How to Start Managing Your Money Today
                </h2>

                <div className="bg-green-50 p-6 rounded-lg mt-6 border border-green-200">
                  <h3 className="text-lg font-semibold mb-4 text-green-800">Your 5-Step Quick Start Guide</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="text-green-800">Step 1:</strong>
                        <span className="text-green-700"> Track all expenses for one week to understand your spending patterns</span>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="text-green-800">Step 2:</strong>
                        <span className="text-green-700"> List all your income sources and monthly fixed expenses</span>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="text-green-800">Step 3:</strong>
                        <span className="text-green-700"> Set one specific financial goal for the next 3 months</span>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="text-green-800">Step 4:</strong>
                        <span className="text-green-700"> Open a separate savings account for emergencies (aim for $500 first)</span>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="text-green-800">Step 5:</strong>
                        <span className="text-green-700"> Use a simple tool or app to track expenses automatically</span>
                      </div>
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-green-700">Making Money Management Effortless</h2>

                <p>
                  The biggest barrier to effective money management isn't lack of knowledge—it's the 
                  perceived complexity and time commitment. Modern tools have eliminated these barriers, 
                  making financial management as simple as sending a text message.
                </p>

                <p>
                  With intelligent expense tracking, automatic categorization, and AI-powered insights, 
                  you can gain complete financial clarity without spending hours on spreadsheets or 
                  complex budgeting apps. The key is choosing tools that adapt to your lifestyle rather 
                  than forcing you to adapt to them.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-green-700">Your Financial Future Starts Now</h2>

                <p>
                  Money management isn't about becoming wealthy overnight—it's about creating stability, 
                  reducing stress, and building the foundation for the life you want. Every day you delay 
                  is a day of compound growth lost and a day of potential stress that could be avoided.
                </p>

                <p>
                  The most successful people aren't necessarily those who earn the most, but those who 
                  manage what they have most effectively. Start small, stay consistent, and watch as 
                  good financial habits transform every area of your life.
                </p>

                <div className="bg-green-50 p-6 rounded-lg mt-8 border border-green-200">
                  <h3 className="text-lg font-semibold mb-2 text-green-800">Ready to Take Control of Your Financial Future?</h3>
                  <p className="text-green-700 mb-4">
                    Start your money management journey today with tools designed to make financial tracking 
                    effortless. Join thousands who've already discovered the peace of mind that comes with 
                    knowing exactly where their money goes.
                  </p>
                  <Link to="/login">
                    <Button className="bg-green-700 hover:bg-green-800 text-white">
                      Start Managing Your Money Now →
                    </Button>
                  </Link>
                </div>
              </div>

              <footer className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full">
                    #MoneyManagement
                  </span>
                  <span className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full">
                    #FinancialWellness
                  </span>
                  <span className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full">
                    #PersonalFinance
                  </span>
                  <span className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full">
                    #BudgetingTips
                  </span>
                  <span className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full">
                    #FinancialEducation
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
            <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
            <div className="grid gap-6">
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold mb-2 hover:text-green-700 transition-colors">
                  <Link to="/blog/kpege-complete-guide">
                    Everything You Can Do with Kpege: Your Complete Personal Finance Management Guide
                  </Link>
                </h3>
                <p className="text-muted-foreground text-sm">
                  Discover all of Kpege's AI-powered features and learn how to transform your expense tracking experience.
                </p>
                <div className="mt-3">
                  <Link to="/blog/kpege-complete-guide">
                    <Button variant="outline" size="sm" className="hover:border-green-700 hover:text-green-700">
                      Read Article →
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
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

export default WhyMoneyManagementMatters; 