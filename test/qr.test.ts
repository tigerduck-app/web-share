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

// Every hash below is ZXing's: Encoder.encode(text, ErrorCorrectionLevel.M, { QR_MASK_PATTERN: mask })
// from com.google.zxing:core 3.5.4, its ByteMatrix hashed as above. ZXING_CHOSEN is Encoder.encode
// with no mask given.
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

// [version, the most bytes it holds, ZXing hash under mask version % 8]
const ZXING_VERSIONS: [number, number, string][] = [
  [1, 14, 'b0c9b81779753a2142e8e48c5552d403259bab1b51a5c9135db51ff7feb4c6c1'],
  [2, 26, '23e5e33da44f654a9b6ad753d532ea478be29030582a56f90fa77ff0d56fa7b3'],
  [3, 42, '0dc241aa20b2818e58b3b4baddfa0452afe34f21a3c65e919c59235942f5f4fd'],
  [4, 62, 'c1fe823554587dcc34bfc42becc4874dd460625574429076d1e9c11f575a0a3a'],
  [5, 84, '5f7707dba07ce360e39622ea304995168a5d3b7c48e35ec0f87186240e8ad233'],
  [6, 106, '1ba0eb508c8bdffe0732af3c6557ec0a8f382140e86529b550849282d937ceb6'],
  [7, 122, '52b0a04f3970d7f211e7b5309f67e8873ef24cb71d7be0fe4514c1b4e6ff1bbb'],
  [8, 152, '657601cd9faa05e540a86724c73680ce28c26961866f6d8a0cfa431e1cddbe58'],
  [9, 180, '6ede2ccff075f75ec381386489332fce5ec76b2235f77e2535909ee1cb52f53b'],
  [10, 213, '6804c8f933c010d9a856580a580876234ba0ad147ba2e2a16ead19d73488b85e'],
  [11, 251, '4b184aca7bd5cd2c16b4f504db32858e7d4141e093f51691e4c987f8ee0e18e7'],
  [12, 287, 'cecb14a736e24529757eeb1870d474d0c289bbf12061383f7b5dc9e1cf86d342'],
  [13, 331, 'c985068f0bce32e54d3a5871922f0f9acd0178a6e98bfdfb010b5ba3c670c5bd'],
  [14, 362, 'd372148a20a85970b320f1288f74dacb470d2a4103c8a0ce7876a90d16900bef'],
  [15, 412, '69e47abbf61af958321cb9b04a1147c8998fc306a78aa53ecb49a25d5c8faf55'],
  [16, 450, 'f6cd1ab74f15ebbc64fc2c7014c44074e9cae8784529c1c84126d9f16bf3f494'],
  [17, 504, '310048ce6aa366bf16cb13219faa0d3e5686db8da4ac039e173886b9e45565bb'],
  [18, 560, 'ad1e1624b41e75a86e4556acc6f21d67e5f95323d5f9c7415baca087304f52b1'],
  [19, 624, '2d17d585887520ed9072cfd0fc0baa16700ac9aad390ef47a9540a246a108181'],
  [20, 666, '7fa468b5dfacba850f1577b9a558bfa0abb0580b81950f21585d49d2d920a287'],
  [21, 711, 'faaf505f29b75baf1c5b7b1f1504ed3f6ebfe90bc36954c2c6fc5e011424c17a'],
  [22, 779, '16754e2e2b0bdd75e33f36ee3cc977dd653584d3eac570ba900558ba7f46a198'],
  [23, 857, 'fb82871c72813fece3e196fd2c50782537dcc9707db69fefe648b3b173336d01'],
  [24, 911, '3094cbd9615cded6db986e0b79d94df80339e42c442ca7a5092e7bd85df3b0c2'],
  [25, 997, 'f6bf9273a88157bbdadb3df1e1620aaa97361a0b40dd51e93127861d84356b5e'],
  [26, 1059, '8ef5384b67907994df9fd0f5345342b1f3f6a547c7e4591307e01a145a63b0ac'],
  [27, 1125, '6d69f1f29c06e18c431226987bc15c3604a9e512c923fc1b5fae48fb58c48019'],
  [28, 1190, '1bed3bb02c5e0740ec91dc1ef21a85ed65075befd3ff49ac5beffb0523c6c167'],
  [29, 1264, '7d03dd9723bc3f3a79179249a9e9c69f7bc058cf6b6c5958549e810537315658'],
  [30, 1370, '68faa2ff82d9e28dc8d87f650e9ab5eafd2288a148fa093facef35faba5f0eb9'],
  [31, 1452, '4b3aa0339c5fdff6b7f5c9f8516f547d1ecd4879b19a525a9b18dfbf8f2f2fa0'],
  [32, 1538, '2371d00bdbfb78c7069b6108c8d6a38deae1f01df8778ec270a8b116b677e109'],
  [33, 1628, 'ced5c8f73d39fbc52527b84d90a1db8027ac5146f1e0f87bb59c0ca85eef7e12'],
  [34, 1722, '58ca5432ef2be7af5f91f64758e6fba29ad50e13b5d5f196ac521453814d359f'],
  [35, 1809, '1efdddd462971cf22a12c71d73c70bdb9d57324e57e04311e3e91d626454f00f'],
  [36, 1911, 'f2f1d03de5ed872d3147dd37ef17e594054e01f3363b7526c1a198f6ddee8464'],
  [37, 1989, 'b1b8ecea37b7b74313a320c37a10975f3333b23bd706b70b73d163dfd949cd86'],
  [38, 2099, 'eab445da345a75877468a7d4d08029a2b53957ab531d3055e3e0cd7f71f730fe'],
  [39, 2213, '9bb7aca40fc0eced743fc69f9b1f927a2942d147d3b7b9f321aac25b01ca69f5'],
  [40, 2331, '84e7a86f07d2c2b633a0313ca0562c44d66f2d3221ba0339cecc9ac9e722dce3'],
];
// One byte past version 9: the character count widens to 16 bits in version 10.
const ZXING_PAST_9 = '0d371115e49a8acfd30bfd3139aa582e530b5b5c06c1fe37b57ace99d84e414b';

// Links whose mask ZXing chooses the same way, by the standard's penalty rules: [mask, link].
const ZXING_CHOSEN: [number, string][] = [
  [2, 'https://share.tigerduck.app/CLASSTABLE/1.B00015999.202610131405.HQS'],
  [3, 'https://share.tigerduck.app/CLASSTABLE/1.B00015999.202610131405.6I4ZUBYZZGI5G4GOUAECTWLD2U7SCPBTHPOPCUG3P4NHGJUOCOXLS3SIS6GJLN3UB5YWDZ'],
  [4, 'https://share.tigerduck.app/CLASSTABLE/1.B00015999.202610131405.DGO4ALMJL3ZLWEPSVGAAYZ32AXXYW4OQKMILU4DTTADWAFQ3.3VDG7BZ3Y5BHFQP7AXPAFAWEJ'],
  [6, 'https://share.tigerduck.app/CLASSTABLE/1.B00015999.202610131405.GHCTG3DPMAE3HFSJQ.SALKBTLUWDC7MW4LOFVBNR3O6S3FZVEIZAC.ZEZAXI35P'],
];

test('a share link, under each mask, is the code ZXing makes', () => {
  ZXING_LINK.forEach((hash, mask) => assert.equal(hashOf(qrCode(LINK, mask)), hash, `mask ${mask}`));
});

test('every version, filled to the last byte, is the code ZXing makes', () => {
  for (const [version, capacity, hash] of ZXING_VERSIONS) {
    const modules = qrCode(filler(capacity), version % 8);
    assert.equal(modules.length, version * 4 + 17, `version ${version}`);
    assert.equal(hashOf(modules), hash, `version ${version}`);
  }
  const past9 = qrCode(filler(ZXING_VERSIONS[8][1] + 1), 10 % 8);
  assert.equal(past9.length, 10 * 4 + 17);
  assert.equal(hashOf(past9), ZXING_PAST_9);
});

test('left to choose, it takes the mask the penalty rules score best', () => {
  for (const [mask, link] of ZXING_CHOSEN) assert.equal(hashOf(qrCode(link)), hashOf(qrCode(link, mask)), link);
  assert.ok(ZXING_LINK.includes(hashOf(qrCode(LINK))));
});

test('text past the largest code is refused', () => {
  assert.throws(() => qrCode(filler(ZXING_VERSIONS[39][1] + 1)), TooLong);
});

test('the dark modules are drawn as one path, a run of them as one rectangle, inside the quiet zone', () => {
  const modules = [
    [true, true, false],
    [false, false, false],
    [false, true, true],
  ];
  assert.equal(svgPath(modules, 4), 'M4,4h2v1h-2zM5,6h2v1h-2z');
});
