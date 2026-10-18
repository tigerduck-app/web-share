import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  F_DROID_PACKAGE, GOOGLE_PLAY_URL, PLAY_PACKAGE,
  androidIntentLink, appSchemeLink, inAppBrowserOf, languageOf, lineExternalUrl, platformOf, readPath,
} from '../src/share.ts';

// The apps' test code (tigerduck-app-android ClassTableShareCodeTest); the page reads its path only.
const CODE_PATH = '/CLASSTABLE/1.B00015999.202610131405.1151.OMHDMNBQGQYDAMGUOGDLFDDULROWCYV6RYYFMACMBQAA.JY2E2OA';

test('a class table path is read in any letter case', () => {
  assert.deepEqual(readPath(CODE_PATH), { kind: 'classtable', rest: CODE_PATH.slice(1) });
  assert.equal(readPath(CODE_PATH.toLowerCase()).kind, 'classtable');
});

test('another type is a newer app’s, and a path with no type shares nothing', () => {
  for (const path of ['/FRIEND/1.B00015999', '/T2/']) assert.equal(readPath(path).kind, 'newer', path);
  for (const path of ['/', '', '/CLASSTABLE', '/FRIEND', '//1.B00015999', '/FRI-END/1']) {
    assert.equal(readPath(path).kind, 'none', path);
  }
});

test('an iPad that reports a Mac counts as iOS, and a Mac does not', () => {
  const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
  assert.equal(platformOf(mac, 5), 'ios');
  assert.equal(platformOf(mac, 0), 'desktop');
  assert.equal(platformOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5), 'ios');
  assert.equal(platformOf('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5), 'android');
  assert.equal(platformOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0), 'desktop');
});

test('LINE is sent to the phone’s browser once, and other in-app browsers are told apart', () => {
  assert.equal(inAppBrowserOf('Mozilla/5.0 (iPhone) Safari Line/14.12.0'), 'line');
  assert.equal(inAppBrowserOf('Mozilla/5.0 (Linux; Android 15) Instagram 350.0'), 'other');
  assert.equal(inAppBrowserOf('Mozilla/5.0 (Linux; Android 15) Chrome/130.0 Mobile'), null);

  const external = lineExternalUrl(`https://share.tigerduck.app${CODE_PATH}`);
  assert.equal(external, `https://share.tigerduck.app${CODE_PATH}?openExternalBrowser=1`);
  assert.equal(lineExternalUrl(external), null);
});

test('the Android link names the package, so no other app receives the code', () => {
  const rest = CODE_PATH.slice(1);
  assert.equal(
    androidIntentLink(rest, PLAY_PACKAGE, GOOGLE_PLAY_URL),
    `intent://share/${rest}#Intent;scheme=tigerduck;package=org.ntust.app.tigerduck;` +
      `S.browser_fallback_url=${encodeURIComponent(GOOGLE_PLAY_URL)};end`,
  );
  assert.match(androidIntentLink(rest, F_DROID_PACKAGE, 'https://f-droid.org/'), /;package=org\.ntust\.app\.tigerduck\.fdroid;/);
  assert.equal(appSchemeLink(rest), `tigerduck://share/${rest}`);
});

test('any Chinese reads Traditional Chinese, everything else English', () => {
  assert.equal(languageOf(['zh-TW']), 'zh');
  assert.equal(languageOf(['ja', 'zh-Hans-CN']), 'zh');
  assert.equal(languageOf(['en-US', 'fr']), 'en');
  assert.equal(languageOf([]), 'en');
});
