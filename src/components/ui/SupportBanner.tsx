import React, { useState, useEffect } from 'react';
import { Heart, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

interface SupportBannerProps {
  className?: string;
  initialText?: string;
  isPreviewMode?: boolean; // New prop to indicate if the banner is in preview mode
}

// Define banner height for consistent references
export const BANNER_HEIGHT = 32; // in pixels

export function SupportBanner({ className = '', initialText, isPreviewMode = false }: SupportBannerProps) {
  const [visible, setVisible] = useState(true);
  const [bannerText, setBannerText] = useState(
    initialText || 
    "You may have noticed some of your data is missing. We apologize for the inconvenience. An engineering intern, AKA Femi, caused this and is making sure it doesn't happen again. Keep using Kpege."
  );

  // useEffect to fetch banner text from API - Placeholder for now
  useEffect(() => {
    if (initialText) return; // Don't fetch if initialText is provided (e.g. for admin preview)

    const fetchBannerText = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'support_banner_text')
          .single();

        if (error) {
          // Don't throw, just log and use default/current text
          console.warn("Error fetching support banner text from Supabase:", error.message);
          // Keep the initial/default text if fetch fails
          // setBannerText("Failed to load banner. Please check back later."); // Or a more user-friendly error
          return;
        }

        if (data && data.value) {
          setBannerText(data.value);
        } else {
          // If no data.value but no error, it means the key might not exist or value is null.
          // Keep the initial/default text in this case as well, or set a specific default.
          console.warn('Support banner text not found or is null in app_settings.');
        }
      } catch (error: any) {
        console.error("Unexpected error fetching banner text:", error.message);
        // Keep the initial/default text
      }
    };

    fetchBannerText();
  }, [initialText]);

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

  // Manage body class to expose banner visibility globally for spacing helper
  useEffect(() => {
    const body = document.body;
    if (visible) {
      body.classList.add('banner-visible');
    } else {
      body.classList.remove('banner-visible');
    }
  }, [visible]);

  // Initialize visibility from localStorage if available
  useEffect(() => {
    if (isPreviewMode) {
      setVisible(true); // Preview should always be initially visible
      return;
    }
    const storedVisibility = localStorage.getItem('support-banner-visible');
    if (storedVisibility !== null) {
      setVisible(storedVisibility === 'true');
    }
  }, [isPreviewMode]);

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
              {bannerText} {' '}
              <Heart className="h-4 w-4 text-primary-foreground inline-block align-middle" />
            </p>
          </div>
        </div>
        
        {!isPreviewMode && ( // Only show close button if not in preview mode
          <button 
            onClick={() => setVisible(false)} 
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-primary-foreground/10 rounded-full z-10" // Ensure button is above marquee viewport
            aria-label="Close banner"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </>
  );
} 