import { useState } from 'react'
import './App.css'

function App() {
  return (
    <div className="app">
      <header>
        <div className="container">
          <div className="logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <span>Kpege</span>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <h1>Finance, <span>finally made simple</span></h1>
          <p>
            Experience peace of mind and clarity with every transaction.
            Take control of your money, effortlessly.
          </p>
          <a href="#" className="cta-button">Get Started Free</a>
          
          <img 
            src="/app-screenshot.png" 
            alt="Kpege App Dashboard" 
            className="hero-image"
          />
        </div>
      </section>

      <section className="features">
        <div className="container">
          <div className="features-header">
            <h2>See Kpege in Action</h2>
            <p>Simplify your finances with our intuitive features</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <img 
                src="/feature-language.png" 
                alt="Natural Language Input" 
                className="feature-image"
              />
              <div className="feature-content">
                <h3>Natural Language Input</h3>
                <p>Simply type what you spent in plain language and Kpege will categorize it for you.</p>
              </div>
            </div>

            <div className="feature-card">
              <img 
                src="/feature-receipt.png" 
                alt="Receipt Scanning" 
                className="feature-image"
              />
              <div className="feature-content">
                <h3>Receipt Scanning</h3>
                <p>Snap a photo of your receipt and Kpege will automatically extract and categorize the transaction.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="testimonials">
        <div className="container">
          <div className="testimonials-header">
            <h2>How Kpege makes you feel</h2>
          </div>

          <div className="testimonial-card">
            <p className="testimonial-text">
              "I've tried many finance apps, but Kpege is the only one that doesn't make me anxious. The simplicity and clarity it provides has transformed my relationship with money."
            </p>
            <div className="testimonial-author">
              <div className="testimonial-author-avatar"></div>
              <div>
                <p className="testimonial-author-name">Sarah Johnson</p>
                <p className="testimonial-author-title">Freelance Designer</p>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <p className="testimonial-text">
              "Before Kpege, I was always stressed about tracking expenses. Now I feel completely in control of my finances without having to spend hours managing them."
            </p>
            <div className="testimonial-author">
              <div className="testimonial-author-avatar"></div>
              <div>
                <p className="testimonial-author-name">Michael Chen</p>
                <p className="testimonial-author-title">Software Engineer</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="benefits">
        <div className="container">
          <div className="benefits-header">
            <h2>The Kpege difference</h2>
          </div>

          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </div>
              <h3>Calm</h3>
              <p>No more financial anxiety. Kpege brings peace of mind through simple, clear insights.</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20"></path>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <h3>Control</h3>
              <p>Take command of your finances without the complexity. Simple tools for powerful results.</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 12 2 2 4-4"></path>
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
              </div>
              <h3>Confidence</h3>
              <p>Make financial decisions with certainty, backed by clear insights and understanding.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container">
          <h2>Ready to take control?</h2>
          <p>Join thousands who have transformed their relationship with money.</p>
          <a href="#" className="cta-button">Get Started Free</a>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-column">
              <h3>Kpege</h3>
              <ul className="footer-links">
                <li><a href="#">About Us</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Press</a></li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h3>Resources</h3>
              <ul className="footer-links">
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Financial Tips</a></li>
                <li><a href="#">Community</a></li>
                <li><a href="#">Partners</a></li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h3>Legal</h3>
              <ul className="footer-links">
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Cookie Policy</a></li>
                <li><a href="#">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Kpege. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App 