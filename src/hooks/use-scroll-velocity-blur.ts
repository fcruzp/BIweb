import { useEffect } from "react";

/**
 * Scroll Velocity-Based Motion Blur
 *
 * Applies a dynamic `backdrop-filter: blur()` to the element with id="pageRoot"
 * based on the velocity and inertia of the user's scroll. The faster you scroll,
 * the more the background blurs — creating a cinematic motion blur effect.
 *
 * Performance notes:
 * - Uses direct DOM mutation (no React state) to avoid re-renders
 * - Uses requestAnimationFrame for smooth 60fps updates
 * - Removes the CSS property entirely when blur <= 0.05 to free GPU compositing
 * - Relies on will-change: backdrop-filter on the target element
 */
export function useScrollVelocityBlur() {
  useEffect(() => {
    const pageRootElement = document.getElementById("pageRoot");
    if (!pageRootElement) return;

    let lastScrollY = window.scrollY;
    let currentVelocity = 0;
    let currentBlur = 0;
    let animationFrameId: number;

    const tick = () => {
      const currentScrollY = window.scrollY;

      // Absolute scroll differential between frames
      const scrollDiff = Math.abs(currentScrollY - lastScrollY);

      // Physics: friction (88%) + acceleration (12%)
      currentVelocity = currentVelocity * 0.88 + scrollDiff * 0.12;

      // Cap velocity to prevent extreme values
      const maxVelocity = 35;
      const normalizedVelocity = Math.min(currentVelocity, maxVelocity);

      // Target blur radius (max 5px)
      const targetBlur = (normalizedVelocity / maxVelocity) * 5.0;

      // Smooth the blur transition for natural easing
      currentBlur = currentBlur * 0.82 + targetBlur * 0.18;

      // Direct DOM mutation — no React re-renders
      if (pageRootElement) {
        if (currentBlur > 0.05) {
          const blurValue = `blur(${currentBlur.toFixed(2)}px)`;
          pageRootElement.style.backdropFilter = blurValue;
          pageRootElement.style.setProperty("-webkit-backdrop-filter", blurValue);
        } else {
          // Remove property entirely to free GPU compositing pipeline
          pageRootElement.style.backdropFilter = "";
          pageRootElement.style.removeProperty("-webkit-backdrop-filter");
        }
      }

      lastScrollY = currentScrollY;
      animationFrameId = requestAnimationFrame(tick);
    };

    // Start the animation loop
    animationFrameId = requestAnimationFrame(tick);

    // Cleanup on unmount (crucial for SPA navigation)
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
}
