/** Nur interne Pfade als Weiterleitungsziel zulassen (verhindert Open Redirects). */
export function safeRedirect(target: unknown): string {
  if (typeof target !== 'string' || !target.startsWith('/')) return '/';
  // protokoll-relative URLs (//evil.com), Backslash-Tricks (/\evil.com) und Steuerzeichen ablehnen
  if (target.startsWith('//') || target.includes('\\') || /[\u0000-\u001F\u007F]/.test(target)) return '/';
  return target;
}
