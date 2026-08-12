import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router keeps the window scroll position across navigations, which drops
 * visitors into the middle of the next page. Reset it on every path change.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    // A hash means the visitor is being sent to a specific element — a project
    // linking to someone's team card, say. Jumping to the top here would undo
    // that scroll a moment before the target page performs it.
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
