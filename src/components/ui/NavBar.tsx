import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './button';

interface NavBarProps {
  isAuthenticated?: boolean;
  onFeaturesClick?: () => void;
  showFeatures?: boolean;
}

// Create a more explicit animation style with regular CSS classes
const NavBar: React.FC<NavBarProps> = ({ 
  isAuthenticated = false, 
  onFeaturesClick,
  showFeatures = true
}) => {
  // Get current location to determine if we're on the home page
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  // Function to scroll to top of page
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // Add CSS to head when component mounts
  useEffect(() => {
    // Create style element
    const style = document.createElement('style');
    style.innerHTML = `
      .nav-link {
        position: relative;
      }
      
      .nav-link::after {
        content: '';
        position: absolute;
        bottom: -3px;
        left: 0;
        width: 0;
        height: 2px;
        background-color: #15803d; /* green-700 */
        transition: width 0.3s ease;
      }
      
      .nav-link:hover::after {
        width: 100%;
      }
    `;
    
    // Append to head
    document.head.appendChild(style);
    
    // Cleanup on unmount
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <header className="bg-background sticky top-0 z-50 m-0 p-0">
      <div className="container mx-auto px-4 flex justify-between items-center h-16 m-0 p-0">
        {isHomePage ? (
          <div onClick={scrollToTop} className="flex items-center cursor-pointer m-0 p-0">
            <img src="/kpege-logo.svg" alt="Kpege" className="h-8 m-0 p-0" />
          </div>
        ) : (
          <Link to="/" className="flex items-center cursor-pointer m-0 p-0">
            <img src="/kpege-logo.svg" alt="Kpege" className="h-10 m-0 p-0" />
          </Link>
        )}
        <nav className="flex items-center space-x-6 m-0 p-0">
          {showFeatures && (
            <button 
              onClick={onFeaturesClick} 
              className="nav-link text-foreground hover:text-green-700 transition-colors text-sm leading-none m-0 p-1"
            >
              Features
            </button>
          )}
          <Link to="/blog" className="nav-link text-foreground hover:text-green-700 transition-colors text-sm leading-none m-0 p-1">
            Blog
          </Link>
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button size="sm" variant="outline" className="hover:border-green-700 hover:text-green-700 h-8 px-3 py-1 text-xs m-0">
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="sm" className="bg-green-700 hover:bg-green-800 text-white h-8 px-3 py-1 text-sm m-0">
                Get Started
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default NavBar; 