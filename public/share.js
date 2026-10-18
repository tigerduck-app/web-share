// What a share link asks for, and the links that open it: pure functions, so the tests read them
// without a browser. The page's own wiring is in app.js.

export const APP_STORE_URL = 'https://apps.apple.com/app/id6761084888';
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=org.ntust.app.tigerduck';
export const F_DROID_URL = 'https://f-droid.org/packages/org.ntust.app.tigerduck.fdroid';

export const PLAY_PACKAGE = 'org.ntust.app.tigerduck';
export const F_DROID_PACKAGE = 'org.ntust.app.tigerduck.fdroid';

/**
 * What [pathname], a path on share.tigerduck.app, shares: `HTTPS://SHARE.TIGERDUCK.APP/<TYPE>/<content>`,
 * the rule both apps follow. A type is letters or digits, then `/`, read in any letter case.
 *
 * - `classtable`: a class table's share code, with `rest` the path after the host;
 * - `newer`: a type a newer app writes, which this page and the installed app may not know;
 * - `none`: no type, so nothing to share.
 */
export function readPath(pathname) {
  const rest = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  const slash = rest.indexOf('/');
  const type = slash > 0 ? rest.slice(0, slash).toUpperCase() : '';
  if (!/^[A-Z0-9]+$/.test(type)) return { kind: 'none' };
  if (type === 'CLASSTABLE') return { kind: 'classtable', rest };
  return { kind: 'newer', rest };
}

/**
 * The device the page is on. iPadOS Safari reports a Mac by default, so a Mac with a touch screen
 * counts as one: no Mac has one.
 */
export function platformOf(userAgent, maxTouchPoints) {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'desktop';
}

/**
 * An app's own browser, which often opens neither an App Link, a Universal Link nor an intent:
 * LINE's can be told to hand the page to the phone's browser; the others cannot.
 */
export function inAppBrowserOf(userAgent) {
  if (/\bLine\//i.test(userAgent)) return 'line';
  if (/Instagram|FBAN|FBAV|FB_IAB|Messenger/i.test(userAgent)) return 'other';
  return null;
}

/** The address LINE opens in the phone's browser; null when the page is there already. */
export function lineExternalUrl(href) {
  const url = new URL(href);
  if (url.searchParams.has('openExternalBrowser')) return null;
  url.searchParams.set('openExternalBrowser', '1');
  return url.toString();
}

/** The app's own scheme for [rest]: `tigerduck://share/<rest>` stands for this host's `<rest>`. */
export function appSchemeLink(rest) {
  return `tigerduck://share/${rest}`;
}

/**
 * Android's link for [rest], naming [packageName] so that no other app that claims the tigerduck
 * scheme receives the code. Chrome goes to [fallback], the app's store page, when it is not
 * installed.
 */
export function androidIntentLink(rest, packageName, fallback) {
  return `intent://share/${rest}#Intent;scheme=tigerduck;package=${packageName};` +
    `S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}

/** Traditional Chinese for any Chinese, English for everything else: the site's two languages. */
export function languageOf(languages) {
  return languages.some((tag) => /^zh\b/i.test(tag)) ? 'zh' : 'en';
}
