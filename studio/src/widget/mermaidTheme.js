/**
 * Mermaid theme helpers for MDSS canvas / book.
 * Studio chrome stays dark; diagram paper can be light (default) or dark.
 */

export const MERMAID_SURFACE_KEY = 'mdss-mermaid-surface';

/** @typedef {'light' | 'dark'} MermaidSurface */

export function getMermaidSurface() {
  try {
    const v = localStorage.getItem(MERMAID_SURFACE_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* ignore */
  }
  return 'light';
}

/** @param {MermaidSurface} surface */
export function setMermaidSurface(surface) {
  try {
    localStorage.setItem(MERMAID_SURFACE_KEY, surface);
  } catch {
    /* ignore */
  }
}

/** @param {MermaidSurface} surface */
export function mermaidInitOptions(surface) {
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    // default = light fills/ink; dark = Mermaid dark palette
    theme: surface === 'dark' ? 'dark' : 'default'
  };
}
