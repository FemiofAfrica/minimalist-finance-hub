import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './button';
import { Menu, X } from 'lucide-react';

interface NavBarProps {
  isAuthenticated?: boolean;
  onFeaturesClick?: () => void;
  showFeatures?: boolean;
}

const NavBar: React.FC<NavBarProps> = ({ 
  isAuthenticated = false, 
  onFeaturesClick,
  showFeatures = true
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Simplified click outside handler
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Only close if clicking outside both the menu and the toggle button
      if (!target.closest('.mobile-menu-container') && 
          !target.closest('.mobile-menu-toggle')) {
        setIsMobileMenuOpen(false);
      }
    };

    // Add event listener with a small delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [isMobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);
  
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // Simplified CSS with better animations
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'navbar-styles';
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
        background-color: #15803d;
        transition: width 0.3s ease;
      }
      
      .nav-link:hover::after {
        width: 100%;
      }

      .mobile-menu-overlay {
        backdrop-filter: blur(4px);
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 100;
      }

      .mobile-menu-slide {
        transform: translateX(100%);
        transition: transform 0.25s ease-out;
        z-index: 101;
        background-color: white;
      }

      .mobile-menu-slide.menu-open {
        transform: translateX(0);
      }

      .mobile-menu-toggle {
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        z-index: 102;
        position: relative;
      }
    `;
    
    // Remove existing style if it exists
    const existingStyle = document.getElementById('navbar-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    document.head.appendChild(style);
    
    return () => {
      const styleElement = document.getElementById('navbar-styles');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  const handleMobileNavClick = (action?: () => void) => {
    setIsMobileMenuOpen(false);
    if (action) {
      // Small delay to allow menu animation to start
      setTimeout(action, 150);
    }
  };

  const handleOverlayClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-background sticky top-0 z-50 border-b border-border/40">
        <div className="container mx-auto px-4 flex justify-between items-center h-10 md:h-14">
          {/* Logo */}
          {isHomePage ? (
            <div onClick={scrollToTop} className="flex items-center cursor-pointer">
              <img src="/kpege-logo.svg" alt="Kpege" className="h-7 md:h-8" />
            </div>
          ) : (
            <Link to="/" className="flex items-center cursor-pointer">
              <img src="/kpege-logo.svg" alt="Kpege" className="h-7 md:h-10" />
            </Link>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {showFeatures && (
              <button 
                onClick={onFeaturesClick} 
                className="nav-link text-foreground hover:text-green-700 transition-colors text-sm leading-none px-1 py-2"
              >
                Features
              </button>
            )}
            <Link to="/about" className="nav-link text-foreground hover:text-green-700 transition-colors text-sm leading-none px-1 py-2">
              About Us
            </Link>
            <Link to="/blog" className="nav-link text-foreground hover:text-green-700 transition-colors text-sm leading-none px-1 py-2">
              Blog
            </Link>
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button size="sm" className="bg-green-700 hover:bg-green-800 text-white h-8 px-3 py-1 text-xs">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button size="sm" className="bg-green-700 hover:bg-green-800 text-white h-8 px-3 py-1 text-sm">
                  Get Started
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 -mr-2 text-foreground hover:text-green-700 transition-colors mobile-menu-toggle"
            onClick={handleMobileMenuToggle}
            aria-label="Toggle mobile menu"
            type="button"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-[100] md:hidden mobile-menu-overlay"
          onClick={handleOverlayClick}
        >
          <div 
            className={`mobile-menu-slide mobile-menu-container fixed top-0 right-0 bottom-0 w-64 bg-background border-l border-border shadow-xl ${
              isMobileMenuOpen ? 'menu-open' : ''
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile menu header with close button */}
            <div className="flex items-center justify-between p-4 border-b border-border h-14">
              <span className="font-semibold text-foreground">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-foreground hover:text-green-700 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <nav className="flex flex-col p-6 space-y-6">
              {showFeatures && (
                <button 
                  onClick={() => handleMobileNavClick(onFeaturesClick)} 
                  className="text-left text-foreground hover:text-green-700 transition-colors text-base font-medium py-2"
                >
                  Features
                </button>
              )}
              <Link 
                to="/about" 
                className="text-foreground hover:text-green-700 transition-colors text-base font-medium py-2"
                onClick={() => handleMobileNavClick()}
              >
                About Us
              </Link>
              <Link 
                to="/blog" 
                className="text-foreground hover:text-green-700 transition-colors text-base font-medium py-2"
                onClick={() => handleMobileNavClick()}
              >
                Blog
              </Link>
              
              <div className="pt-4 border-t border-border">
                {isAuthenticated ? (
                  <Link to="/dashboard" onClick={() => handleMobileNavClick()}>
                    <Button 
                      className="w-full bg-green-700 hover:bg-green-800 text-white h-10 text-sm font-medium"
                    >
                      Go to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link to="/login" onClick={() => handleMobileNavClick()}>
                    <Button 
                      className="w-full bg-green-700 hover:bg-green-800 text-white h-10 text-sm font-medium"
                    >
                      Get Started
                    </Button>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default NavBar; 