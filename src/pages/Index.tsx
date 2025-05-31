import React from 'react';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header/Navigation */}
      <header className="w-full max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="flex items-center bg-green-50 rounded-full px-6 py-2 border border-green-100">
          <svg className="w-5 h-5 text-green-600 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4L9 12V18L15 21V12L20 4H4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-green-800 font-medium">Kpege</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-5xl sm:text-6xl font-bold mb-6">
          <span className="text-gray-900">Finance, finally </span>
          <span className="text-green-800">made simple</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
          Experience peace of mind and clarity with every transaction. Take control of your money, effortlessly.
        </p>
        <div className="flex flex-col items-center">
          <Link to="/login" className="bg-green-800 text-white px-8 py-4 rounded-full text-lg font-medium shadow-md hover:bg-green-700 transition-colors flex items-center mb-6">
            Try Kpege Now
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </Link>
          <p className="text-gray-500 text-sm">No signup required • Try it instantly • Your data stays private</p>
        </div>
      </section>

      {/* Demo Section */}
      <section className="w-full max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl font-bold mb-6">See Kpege in Action</h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
          Experience the magic yourself. Try our natural language parser or receipt scanning in this safe demo environment.
        </p>
        
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          {/* Natural Language Input */}
          <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center">
            <div className="bg-green-50 p-4 rounded-full mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-4">Natural Language Input</h3>
            <p className="text-gray-600 mb-6">Describe your transaction naturally - no API key required!</p>
            <div className="w-full">
              <textarea 
                className="w-full border border-gray-300 rounded-lg p-4 mb-4"
                placeholder="e.g., I spent 5,000 Naira on groceries yesterday"
                rows={4}
              ></textarea>
              <button className="bg-green-800 text-white px-6 py-3 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12"></path>
                </svg>
                Parse Transaction
              </button>
            </div>
          </div>
          
          {/* Receipt Scanning */}
          <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center">
            <div className="bg-green-50 p-4 rounded-full mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-4">Receipt Scanning</h3>
            <p className="text-gray-600 mb-6">Upload receipts and invoices for instant processing</p>
            <button className="bg-green-800 text-white px-6 py-3 rounded-full">
              Try Receipt Scan
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl font-bold mb-6">How Kpege makes you feel</h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
          More than just a finance app, Kpege transforms your relationship with money
        </p>
        
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {/* Testimonial 1 */}
          <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
            <div className="bg-green-50 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
            </div>
            <p className="italic mb-6 text-gray-700">"I finally feel in control of my money. Kpege makes tracking expenses feel effortless."</p>
            <div>
              <p className="font-bold">Sarah Chen</p>
              <p className="text-gray-500 text-sm">Freelance Designer</p>
            </div>
          </div>
          
          {/* Testimonial 2 */}
          <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
            <div className="bg-green-50 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <p className="italic mb-6 text-gray-700">"No more spreadsheet stress. I can just speak my transactions and move on with my day."</p>
            <div>
              <p className="font-bold">Marcus Johnson</p>
              <p className="text-gray-500 text-sm">Small Business Owner</p>
            </div>
          </div>
          
          {/* Testimonial 3 */}
          <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
            <div className="bg-green-50 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
            <p className="italic mb-6 text-gray-700">"The peace of mind knowing exactly where my money goes is priceless."</p>
            <div>
              <p className="font-bold">Elena Rodriguez</p>
              <p className="text-gray-500 text-sm">Graduate Student</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="w-full max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Benefit 1 */}
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4 text-green-800">Calm</h3>
            <p className="text-gray-600">No more financial anxiety. Just clarity and peace of mind.</p>
          </div>
          
          {/* Benefit 2 */}
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4 text-green-800">Control</h3>
            <p className="text-gray-600">Know exactly where your money goes, when it goes there.</p>
          </div>
          
          {/* Benefit 3 */}
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4 text-green-800">Confidence</h3>
            <p className="text-gray-600">Make financial decisions with complete information.</p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="w-full max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to take control?</h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
          Join thousands of people who've found financial peace with Kpege. Your future self will thank you.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/login" className="bg-green-800 text-white px-8 py-4 rounded-full text-lg font-medium shadow-md hover:bg-green-700 transition-colors flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
            </svg>
            Sign Up Free
          </Link>
          <Link to="/login" className="border border-green-800 text-green-800 px-8 py-4 rounded-full text-lg font-medium shadow-sm hover:bg-green-50 transition-colors flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
            </svg>
            Log In
          </Link>
        </div>
        <p className="mt-6 text-gray-500 text-sm">No credit card required • Setup in under 2 minutes</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <svg className="w-6 h-6 text-green-600 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4L9 12V18L15 21V12L20 4H4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-green-800 font-bold text-xl">Kpege</span>
              </div>
              <p className="text-gray-600">Your AI-powered minimalist finance hub. Experience peace of mind and clarity with every transaction.</p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-green-800">Features</a></li>
                <li><a href="#" className="text-gray-600 hover:text-green-800">Pricing</a></li>
                <li><a href="#" className="text-gray-600 hover:text-green-800">Security</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-green-800">About</a></li>
                <li><a href="#" className="text-gray-600 hover:text-green-800">Privacy</a></li>
                <li><a href="#" className="text-gray-600 hover:text-green-800">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="text-center text-gray-500 text-sm">
            <p>© 2024 Kpege. All rights reserved. Made with ❤️ for your financial peace of mind.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
