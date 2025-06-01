import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
            Financial insights, tips, and updates coming soon.
          </p>

          {/* Placeholder Blog Posts */}
          <div className="grid gap-8 mb-12">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-3">Coming Soon: Financial Insights</h2>
              <p className="text-muted-foreground mb-4">
                We're working on bringing you valuable content to help you better manage your finances.
                Stay tuned for articles on budgeting, saving, investing, and more.
              </p>
              <div className="text-sm text-muted-foreground">
                Expected launch: Q2 2025
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