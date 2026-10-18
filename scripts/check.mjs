// Run before every deploy: the files Apple and Google read must be ones they accept. A wrong one
// fails without an error anywhere, and the apps' links then open the browser instead.

import { readFileSync } from 'node:fs';

const problems = [];
const read = (path) => readFileSync(new URL(`../public/${path}`, import.meta.url), 'utf8');
const json = (path) => {
  try {
    return JSON.parse(read(path));
  } catch (error) {
    problems.push(`${path} is not JSON: ${error.message}`);
    return null;
  }
};

const aasa = json('.well-known/apple-app-site-association');
const details = aasa?.applinks?.details ?? [];
if (!details.some((d) => d.appIDs?.includes('43UV8F72V6.org.ntust.app.TigerDuck'))) {
  problems.push('apple-app-site-association does not name the iOS app');
}

const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const links = json('.well-known/assetlinks.json') ?? [];
for (const pkg of ['org.ntust.app.tigerduck', 'org.ntust.app.tigerduck.fdroid']) {
  const entry = links.find((link) => link.target?.package_name === pkg);
  const prints = entry?.target?.sha256_cert_fingerprints ?? [];
  if (!entry) problems.push(`assetlinks.json has no entry for ${pkg}`);
  else if (prints.length === 0 || !prints.every((print) => FINGERPRINT.test(print))) {
    problems.push(`assetlinks.json: ${pkg} needs its signing key's SHA-256, as AA:BB:... in upper case`);
  }
}

if (!/\/\.well-known\/apple-app-site-association\s+Content-Type: application\/json/.test(read('_headers'))) {
  problems.push('_headers does not serve apple-app-site-association as application/json');
}

if (problems.length) {
  console.error(problems.map((problem) => `- ${problem}`).join('\n'));
  process.exit(1);
}
console.log('Association files OK');
