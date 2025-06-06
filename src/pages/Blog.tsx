import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, Tag, ArrowRight } from 'lucide-react';
import NavBar from "@/components/ui/NavBar";

const Blog = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check if user is authenticated
  useEffect(() => {
    // This would typically check with your auth service
    const checkAuth = async () => {
      try {
        // Mock authentication check
        const token = localStorage.getItem('kpege-auth-token');
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header/Navigation */}
      <NavBar 
        isAuthenticated={isAuthenticated}
        showFeatures={false}
      />

      {/* Blog Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Kpege Blog</h1>
          <p className="text-xl text-muted-foreground mb-12 text-center">
            Financial insights, tips, and product updates to help you master your money.
          </p>

          {/* Featured Article */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Latest Articles</h2>
            <div className="grid gap-8">
              {/* Featured Article Card */}
              <Card className="p-6 md:p-8 hover:shadow-lg transition-shadow">
                <div className="flex flex-col">
                  <div className="mb-4">
                    <span className="inline-block bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full mb-3">
                      Featured
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold mb-3 leading-tight hover:text-green-700 transition-colors">
                      <Link to="/blog/why-money-management-matters">
                        Why Managing Your Money is Important: The Complete Guide to Financial Wellness
                      </Link>
                    </h2>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
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
                    </div>
                    
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      Money management isn't just about tracking expenses—it's about creating the life you want, 
                      reducing stress, and building a secure future. Discover why effective financial management 
                      is one of the most important skills you can develop, and learn practical steps to start today.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                      Money Management
                    </span>
                    <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                      Financial Wellness
                    </span>
                    <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                      Personal Finance
                    </span>
                    <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                      Budgeting Tips
                    </span>
                  </div>
                  
                  <Link to="/blog/why-money-management-matters">
                    <Button className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white">
                      Read Full Article
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </Card>

              {/* Second Article Card */}
              <Card className="p-6 md:p-8 hover:shadow-lg transition-shadow">
                <div className="flex flex-col">
                  <div className="mb-4">
                    <h2 className="text-xl md:text-2xl font-bold mb-3 leading-tight hover:text-green-700 transition-colors">
                      <Link to="/blog/kpege-complete-guide">
                        Everything You Can Do with Kpege: Your Complete Personal Finance Management Guide
                      </Link>
                    </h2>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
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
                    </div>
                    
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      Discover how Kpege transforms personal finance management through AI-powered expense tracking, 
                      natural language processing, and intelligent financial insights. Learn about current features 
                      and get a preview of exciting upcoming features like predictive budgeting and bank integration.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                      Personal Finance
                    </span>
                    <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                      AI
                    </span>
                    <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                      Expense Tracking
                    </span>
                    <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                      FinTech
                    </span>
                  </div>
                  
                  <Link to="/blog/kpege-complete-guide">
                    <Button variant="outline" className="w-full sm:w-auto hover:border-green-700 hover:text-green-700">
                      Read Full Article
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>

          {/* Additional Blog Posts Section */}
          <div className="grid gap-8 mb-12">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-3">More Financial Insights Coming Soon</h2>
              <p className="text-muted-foreground mb-4">
                We're working on bringing you more valuable content including budgeting strategies, 
                saving tips, investment basics, and personal finance best practices.
              </p>
              <div className="text-sm text-muted-foreground">
                Next articles: Q1 2025
              </div>
            </Card>
          </div>

          <div className="text-center">
            <Link to="/">
              <Button className="bg-green-700 hover:bg-green-800 text-white">
                Return to Homepage
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-slate-900 text-slate-300">
        <div className="container mx-auto px-4 text-center">
          <p>© 2025 Kpege. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Blog; 