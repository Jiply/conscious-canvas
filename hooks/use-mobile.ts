// Import React for hooks
import * as React from "react";

// Define the screen width breakpoint (in pixels) that separates mobile from desktop
// Screens below 768px are considered mobile
const MOBILE_BREAKPOINT = 768;

/**
 * Custom hook to detect if the current device is mobile
 * Uses CSS media queries and window resize events for responsive behavior
 * @returns {boolean} true if screen width is below mobile breakpoint, false otherwise
 */
export function useIsMobile() {
  // State: Track whether device is currently mobile (undefined until first check)
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined
  );

  // Effect: Set up media query listener to detect screen size changes
  React.useEffect(() => {
    // Create a media query list that matches screens smaller than mobile breakpoint
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    // Handler: Update mobile state when screen size changes
    const onChange = () => {
      // Set isMobile to true if window width is less than breakpoint
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Listen for changes to the media query (screen resizes, orientation changes)
    mql.addEventListener("change", onChange);

    // Set initial value immediately on mount
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    // Cleanup: Remove event listener when component unmounts
    return () => mql.removeEventListener("change", onChange);
  }, []); // Empty dependency array = run only once on mount

  // Return boolean (convert undefined to false using !!)
  return !!isMobile;
}
