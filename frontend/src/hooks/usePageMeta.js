import { useEffect } from "react";

const SITE_NAME = "Innovative Waste Management Lab";

function setMeta(selector, attr, value, content) {
  let el = document.head.querySelector(selector);
  let created = false;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, value);
    document.head.appendChild(el);
    created = true;
  }
  const previous = el.getAttribute("content");
  el.setAttribute("content", content);
  return () => {
    if (created) el.remove();
    else if (previous != null) el.setAttribute("content", previous);
  };
}

/**
 * Per-page <title> and description. Without this every route shares the single
 * title baked into index.html, which hurts search results, tab strips and
 * shared links alike.
 */
export default function usePageMeta(title, description) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;

    const restore = description
      ? [
          setMeta('meta[name="description"]', "name", "description", description),
          setMeta('meta[property="og:description"]', "property", "og:description", description),
        ]
      : [];
    const restoreOgTitle = setMeta('meta[property="og:title"]', "property", "og:title", document.title);

    return () => {
      document.title = previousTitle;
      restore.forEach((fn) => fn());
      restoreOgTitle();
    };
  }, [title, description]);
}
