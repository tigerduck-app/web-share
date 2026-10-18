# TigerDuck share links

The page behind `https://share.tigerduck.app/<TYPE>/<content>`, the links TigerDuck's share QR codes hold. A class table's type is `CLASSTABLE`.

## How a link opens

- **With TigerDuck installed**, the phone opens the app directly: Android App Links and iOS Universal Links claim the whole host, and this page never loads. That needs the two association files below.
- **Otherwise the browser loads this page**, which shows what is shared and the ways in:
  - **Android:** an "Open in TigerDuck" button. It is an `intent:` link that names the Play package, plus one for the F-Droid package. Naming the package means no other app that claims the `tigerduck` scheme receives the code. Chrome goes to the store when the app is not installed.
  - **iPhone and iPad:** the Smart App Banner. Its Open always goes to TigerDuck, and `app-argument` hands it this page's address. There is also a `tigerduck://share/<rest>` button.
  - **Computers:** the stores, and a note to open the link on a phone.
- **Without the app:** the store buttons, and the page asks the user to come back after installing and tap Open again. The code is never put in a store URL, the clipboard or an install referrer.
- **LINE's in-app browser** opens neither kind of link, so the page sends itself to the phone's browser with `?openExternalBrowser=1`. Other in-app browsers get a note instead.

`tigerduck://share/<rest>` stands for `https://share.tigerduck.app/<rest>` in both apps.

A class table code (`CLASSTABLE/`) is decoded in the browser by `src/classtable.ts`. It uses the packed layout both apps agreed (tigerduck-app#612), and the tests pin its shared test codes. The page shows "<student ID> 要分享課表給你" with the terms, course count and share time. A damaged code says so and offers no button. A newer version asks the user to update.

## Privacy

A class table link holds the sharer's student ID and course codes in its path.

- **Static assets only.** No Worker code reads a path, and observability is off in `wrangler.jsonc`, because its request logs would keep every path.
- **The whole host** sends `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`, `Cache-Control: no-store` and a strict CSP (`public/_headers`).
- **No analytics.**
- **The code is read in the browser only.** Link previews show generic text.

## Layout

| Path | What |
|---|---|
| `src/app.ts`, `share.ts`, `classtable.ts`, `strings.ts`, `banner.ts` | The page's scripts, in TypeScript. `npm run build` compiles them into `public/js/`, which git ignores. `share.ts` and `classtable.ts` hold the pure functions the tests read. |
| `public/index.html`, `style.css`, `logo.png` | The page. |
| `public/.well-known/apple-app-site-association` | iOS: app ID `43UV8F72V6.org.ntust.app.TigerDuck` (iPhone, iPad and Mac), all paths, case-insensitive. |
| `public/.well-known/assetlinks.json` | Android: `org.ntust.app.tigerduck` (Play App Signing key) and `org.ntust.app.tigerduck.fdroid` (the key the f-droid.org build is signed with). |
| `public/_headers` | The headers above. The association file is served as `application/json`. |

## Deploy

```sh
npm ci
npm test            # tsc type-checks, then node --test runs the .ts tests directly
npm run check       # the association files, before every deploy
npx wrangler deploy # runs npm run build first; the first deploy also creates share.tigerduck.app's DNS record
```

Workers Builds (deploying from git) does not run `build` from `wrangler.jsonc`: set its Build command to `npm run build`. Without it, `/js/app.js` is missing and the page does nothing.

Node 22.18 or later runs the tests and `scripts/check.ts` without a build, so `src/` uses only TypeScript that Node can strip (`erasableSyntaxOnly`).

The association files must be live before an app version that claims the host is released. Android verifies the domain at install or update.

After deploying, check:
- `curl -sI https://share.tigerduck.app/.well-known/assetlinks.json` and `curl -sI https://share.tigerduck.app/.well-known/apple-app-site-association`: both must answer 200 with `application/json`.
- `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://share.tigerduck.app&relation=delegate_permission/common.handle_all_urls`
- Apple's CDN copy, which can lag behind: `https://app-site-association.cdn-apple.com/a/v1/share.tigerduck.app`

## Not done yet

- **The signing fingerprints** in `assetlinks.json`. `npm run check` fails until both are filled in.
- **A QR code of the link on computers.**
