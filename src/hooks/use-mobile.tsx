import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Default to false on server, useEffect will update on client
  const [isMobile, setIsMobile] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  React.useEffect(() => {
    // Handler to update state based on window width
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Check on mount
    if (typeof window !== 'undefined') {
      checkDevice();

      // Listen for resize events
      window.addEventListener("resize", checkDevice);

      // Cleanup listener
      return () => window.removeEventListener("resize", checkDevice);
    }
  }, []);

  return isMobile; // Return the state directly
}
