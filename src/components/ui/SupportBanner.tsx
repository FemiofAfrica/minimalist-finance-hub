import React, { useState, useEffect } from 'react';
import { Heart, X } from 'lucide-react';

interface SupportBannerProps {
  className?: string;
}

// Define banner height for consistent references
export const BANNER_HEIGHT = 32; // in pixels

export function SupportBanner({ className = '' }: SupportBannerProps) {
  const [visible, setVisible] = useState(true);

  // Emit custom event when visibility changes
  useEffect(() => {
    // Create and dispatch custom event with visibility state
    const event = new CustomEvent('banner-visibility-change', { 
      detail: { visible } 
    });
    document.dispatchEvent(event);

    // Store visibility in localStorage to persist between page loads
    localStorage.setItem('support-banner-visible', String(visible));
  }, [visible]);

  // Initialize visibility from localStorage if available
  useEffect(() => {
    const storedVisibility = localStorage.getItem('support-banner-visible');
    if (storedVisibility !== null) {
      setVisible(storedVisibility === 'true');
    }
  }, []);

  if (!visible) return null;

  return (
    <>
      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(100%); }
            /* Scroll in and pause when link is visible */
            30% { transform: translateX(-40%); } /* Adjust -40% as needed */
            50% { transform: translateX(-40%); } /* Pause for 20% of duration */
            /* Scroll out */
            100% { transform: translateX(-160%); } /* Ensure it goes fully off-screen */
          }
          
          .marquee-text-container {
            animation: marquee 60s linear infinite; /* Updated duration */
            display: inline-block;
            white-space: nowrap;
            will-change: transform;
          }
          .marquee-viewport {
            overflow-x: hidden;
          }
          .support-banner-content > p {
            overflow: visible !important;
            text-overflow: clip !important;
          }
          
          /* Add any mobile-specific styles here if needed */
          @media (max-width: 767px) { /* Tailwind's 'md' breakpoint is 768px */
            /* Mobile-specific styles if needed */
          }
        `}
      </style>
      <div 
        className={`fixed top-0 left-0 right-0 w-full bg-primary text-primary-foreground py-1.5 px-4 flex items-center justify-center z-50 ${className}`}
        style={{ height: `${BANNER_HEIGHT}px` }}
      >
        {/* This div acts as the viewport for the marquee on mobile */}
        <div className="marquee-viewport flex-grow flex items-center justify-center gap-2 max-w-4xl mx-auto px-8 relative overflow-hidden">
          <div className="marquee-text-container whitespace-nowrap">
            <p className="text-sm inline-block">
              You may have noticed some of your data is missing. We apologize for the inconvenience. An engineering intern, AKA Femi, caused this and is making sure it doesn't happen again. Keep using SayFin. {' '}
              <Heart className="h-4 w-4 text-primary-foreground inline-block align-middle" />
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setVisible(false)} 
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-primary-foreground/10 rounded-full z-10" // Ensure button is above marquee viewport
          aria-label="Close banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  );
} 