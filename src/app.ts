// The share page: what the link shares, and the buttons that open it in TigerDuck. Reached only
// when the phone handed the link to the browser instead of the app. Nothing here goes to a server:
// the page is static, and the code is read where it is, in the address bar.

import {
  APP_STORE_URL, F_DROID_PACKAGE, F_DROID_URL, GOOGLE_PLAY_URL, PLAY_PACKAGE,
  androidIntentLink, appSchemeLink, inAppBrowserOf, languageOf, lineExternalUrl, platformOf, readPath,
} from './share.ts';
import type { Platform, Share } from './share.ts';
import { Refused, decodeClassTable } from './classtable.ts';
import type { ClassTable } from './classtable.ts';
import { STRINGS } from './strings.ts';

const languages = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
const lang = languageOf(languages);
const t = STRINGS[lang];
document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
document.title = t.pageTitle;

const browser = inAppBrowserOf(navigator.userAgent);
const external = browser === 'line' ? lineExternalUrl(location.href) : null;
if (external) {
  location.replace(external);
} else {
  render(readPath(location.pathname), platformOf(navigator.userAgent, navigator.maxTouchPoints || 0));
}

function render(share: Share, platform: Platform) {
  const actions = document.getElementById('actions')!;
  const say = (id: string, text?: string) => { document.getElementById(id)!.textContent = text ?? ''; };

  if (share.kind !== 'classtable') {
    say('title', share.kind === 'newer' ? t.newerTitle : t.noneTitle);
    say('body', share.kind === 'newer' ? t.newerBody : t.noneBody);
    storeButtons(platform).forEach((button) => actions.append(button));
    return;
  }

  // Read here, in the browser: the code never leaves the address bar.
  let table: ClassTable;
  try {
    table = decodeClassTable(`https://share.tigerduck.app${location.pathname}`);
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    say('title', error.reason === 'newer' ? t.newerTitle : t.damagedTitle);
    say('body', error.reason === 'newer' ? t.newerBody : t.damagedBody);
    if (error.reason === 'newer') storeButtons(platform).forEach((button) => actions.append(button));
    return;
  }
  say('title', t.classTableFrom(table.studentId));
  showDetails(table);
  if (platform === 'desktop') {
    say('body', t.desktop);
    storeButtons(platform).forEach((button) => actions.append(button));
    return;
  }
  say('body', browser === 'other' ? t.inAppBrowser : '');
  if (platform === 'android') {
    actions.append(button(t.open, androidIntentLink(share.rest, PLAY_PACKAGE, GOOGLE_PLAY_URL), true));
    actions.append(button(t.openFDroid, androidIntentLink(share.rest, F_DROID_PACKAGE, F_DROID_URL)));
  } else {
    // The Smart App Banner above the page is the sure way in: its Open goes to TigerDuck, while any
    // app can claim the tigerduck scheme.
    actions.append(button(t.open, appSchemeLink(share.rest), true));
  }
  say('hint', t.notInstalled);
  storeButtons(platform).forEach((store) => actions.append(store));
}

function showDetails(table: ClassTable) {
  const list = document.getElementById('details')!;
  const row = (label: string, value: string) => {
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = value;
    list.append(term, detail);
  };
  row(t.terms, table.terms.map(({ semester }) => `${semester.slice(0, 3)}-${semester.slice(3)}`).join(lang === 'zh' ? '、' : ', '));
  row(t.courses, String(table.terms.reduce((sum, term) => sum + term.courseNos.length, 0)));
  row(t.sharedAt, new Intl.DateTimeFormat(lang === 'zh' ? 'zh-TW' : 'en', {
    timeZone: 'Asia/Taipei', dateStyle: 'medium', timeStyle: 'short',
  }).format(table.sharedAt));
}

function storeButtons(platform: Platform): HTMLAnchorElement[] {
  const stores = ({
    ios: [['App Store', APP_STORE_URL]],
    android: [['Google Play', GOOGLE_PLAY_URL], ['F-Droid', F_DROID_URL]],
    desktop: [['App Store', APP_STORE_URL], ['Google Play', GOOGLE_PLAY_URL], ['F-Droid', F_DROID_URL]],
  } satisfies Record<Platform, [string, string][]>)[platform];
  return stores.map(([name, url]) => button(`${t.getApp} · ${name}`, url));
}

function button(label: string, href: string, primary = false): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = primary ? 'button primary' : 'button';
  link.href = href;
  link.textContent = label;
  // Neither the store nor anything else learns the page it came from, whatever the browser's default.
  link.rel = 'noreferrer';
  return link;
}
