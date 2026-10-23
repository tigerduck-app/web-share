import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { TooLong, qrCode, svgPath } from '../src/qr.ts';

// The apps' test code (tigerduck-app-android ClassTableShareCodeTest), as a link.
const LINK = 'https://share.tigerduck.app/CLASSTABLE/1.B00015999.202610131405.1151.OMHDMNBQGQYDAMGUOGDLFDDULROWCYV6RYYFMACMBQAA.JY2E2OA';
const filler = (n: number) => 'tigerduck share 0123456789 '.repeat(Math.ceil(n / 27)).slice(0, n);

/** The modules row by row as 1s and 0s, hashed: what ZXing 3.5.4 makes of the same text, level M. */
const hashOf = (modules: boolean[][]) =>
  createHash('sha256').update(modules.map((row) => row.map((dark) => (dark ? '1' : '0')).join('')).join('')).digest('hex');

// From ZXing's Encoder.encode(text, ErrorCorrectionLevel.M, { QR_MASK_PATTERN: mask }).
const ZXING_LINK = [
  '10d0a47ed922e5623176d2d6d164eeef13d62a4d21a5b29fae8b9d99f2969dc0',
  'b277ecce7d527edc62725830689352b0323cc84ca6fecc4315e1050cbdbbb69d',
  '3ab743e1fe1678eb51ec311307048b4674ada3982bdfad0f1e20816e331984f1',
  '7cf03d403ef68961d6b8fa63e1a59c18a0c83ed1f74085ad5494b04957fbd405',
  'b3b5e00cf8cd563164469499753235ebd937eac05bb599486207d300cd46eb27',
  'd0d467b9cb41d3ecd47bf842f4ab7a7d07afd5183018129d8f83cc052f7d765a',
  '5e71288c0eb019280fd383c948b154143e0832d9358a5581d0d6f0f3303da22f',
  'b617bc11dd87241aceab959c9f8ba82f547a85fbf43d16b9974b4ef75bac6743',
];

// [length of the filler text, version ZXing chose, ZXing's hash with mask length % 8]
const ZXING_SIZES: [number, number, string][] = [
  [1, 1, 'd7b6798ee79d5c597bb482775eab80550119d0c2618ec74de5a85f2fa928e82a'],
  [14, 1, 'ad13397281e2445a947d4dcf02f235746f3ae386662002dc0151ef79243ff040'],
  [15, 2, 'feb173e7fb4298c9b4044fb91ad88b124b3e4f8522cff3ac32a52d853f5a6f84'],
  [26, 2, '23e5e33da44f654a9b6ad753d532ea478be29030582a56f90fa77ff0d56fa7b3'],
  [60, 4, 'aeb496b823ae190a0e7e8bb326ab4d0462b0f251222ffb6964d46060d4e2a536'],
  [100, 6, 'c32d9eb61c13eb12a95fa042d9288440823d2bfe901d01d27bc1bc9eab63f2b6'],
  [154, 9, 'ed6f14687d14fda8796a9572fed87b4825c1bf4b3e0e8f14a7f984a756edf014'],
  [155, 9, '16ed931f42a64d114c2fdab0640279c924498866280bebb240f03c9c686ee28d'],
  [230, 11, '92ac8fdffc9ce6633f578c294a1fe850501971260f0d2c0ae5ba1b1a2d0b9e2e'],
  [321, 13, '7254676a9bc0928ea476dac1ef0b3a08c3fb89a82e88a919bcbbda1e77068f3f'],
  [500, 17, 'bd38b967bd20aabe39a1b971e917467b73a6f07bd7d4300004371d0e46d94193'],
  [800, 23, '9e420093bc4707b25f9a752f1b932381f5e02a6ea3c702b5e7e6260fe81e446b'],
  [1100, 27, 'b1b695ac5d5ac968edc6b2d762c2d5741d7780ffce841d800662cdd7cb9697b9'],
  [1500, 32, '99bd1e55e0489a5fa48055737c25d8a22f68cc39f247bafa96c851d6eb3de703'],
  [1900, 36, '6c233fd69b87f0e9b0aa04c3dd3812779ac8ce7b44c577eb9781e3dc872f6540'],
  [2331, 40, 'e57eaaf6e1856d0a1cd7c00cfd3c028c38cf0c284025631a7c6bccda81ed7022'],
];

test('a share link, under each mask, is the code ZXing makes', () => {
  ZXING_LINK.forEach((hash, mask) => assert.equal(hashOf(qrCode(LINK, mask)), hash, `mask ${mask}`));
});

test('every size up to the largest is the code ZXing makes, in the version it chose', () => {
  for (const [length, version, hash] of ZXING_SIZES) {
    const modules = qrCode(filler(length), length % 8);
    assert.equal(modules.length, version * 4 + 17, `length ${length}`);
    assert.equal(hashOf(modules), hash, `length ${length}`);
  }
});

test('left to choose, it takes one of the eight masks, the same each time', () => {
  const chosen = hashOf(qrCode(LINK));
  assert.ok(ZXING_LINK.includes(chosen));
  assert.equal(hashOf(qrCode(LINK)), chosen);
});

test('text past the largest code is refused', () => {
  assert.throws(() => qrCode(filler(2332)), TooLong);
});

test('the dark modules are drawn as one path, a run of them as one rectangle, inside the quiet zone', () => {
  const modules = [
    [true, true, false],
    [false, false, false],
    [false, true, true],
  ];
  assert.equal(svgPath(modules, 4), 'M4,4h2v1h-2zM5,6h2v1h-2z');
});
