/**
 * Which studio process this page was served by.
 *
 * studio:demo is the Vite app and never loads webgme.classes.
 * studio:webgme serves this same UI from the engine, which loads window.GME
 * before the app module.
 */
export function isDemoRuntime() {
  return typeof window === 'undefined' || typeof window.GME === 'undefined';
}
