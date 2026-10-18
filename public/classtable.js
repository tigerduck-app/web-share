// A class table share code's packed layout, version 1: the decoder only, as the apps write codes
// and this page reads them. The layout is the one both apps agreed (tigerduck-app#612), and the
// tests pin its shared test codes. Every class table has exactly one code: anything an encoder
// would write differently is refused here, as the apps refuse it.

export const PREFIX = 'HTTPS://SHARE.TIGERDUCK.APP/CLASSTABLE/';

const A36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const VERSION = '1';
const MAX_STUDENT_ID = 16;
const MAX_TERMS = 24;
const MAX_COURSES = 64;
/** 2024-01-01 00:00 in Taipei; share times are minutes since, in 24 bits. */
const EPOCH_MS = Date.UTC(2023, 11, 31, 16, 0);
const KINDS = '12H';
const LETTERS = 'BMD';
const KNOWN_HEADS = ('3N 3NG 3T 3TG AC AD AI AS AT BA BB BE CC CE CH CI CS CT CX DT EC EE EN EO EP ES ET FB FE FL FN GD ' +
  'GE HC IB IC IM IS MA MB ME MG MI PA PE RD SD SI TB TC TE TM TU TX VE ZA').split(' ');
const HEAD_VALUES = 676 * 2 + 26;
const COURSE = /^(3[A-Z]{2}|[A-Z]{2}|3[A-Z])([A-Z0-9]{6,7})$/;
const STUDENT = /^([A-Z])([0-9]{3})([0-9]{5})$/;
const SHAPES = [
  ['leveled', /^([0-9])([0-9]{3})([37])([0-9]{2})$/],
  ['lettered', /^([0-9]{3})([AB])0([0-9]{2})$/],
  ['general', /^G([0-9]{3})3([0-9]{2})$/],
  ['short', /^([0-9]{3})7([0-9]{2})$/],
];

/** Why a code was refused. */
export class Refused extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason; // 'newer' | 'malformed' | 'checksum'
  }
}

const malformed = () => { throw new Refused('malformed'); };

/**
 * The class table [text] holds: `{ studentId, sharedAt (Date), terms: [{ semester, courseNos }] }`,
 * newest term first. Throws [Refused] for a newer version, a checksum mismatch, or anything else.
 */
export function decodeClassTable(text) {
  const code = text.trim().toUpperCase();
  if (!code.startsWith(PREFIX)) malformed();
  const body = code.slice(PREFIX.length);
  const version = body.charAt(0);
  if (version >= '2' && version <= '9' && version.length === 1) throw new Refused('newer');
  if (version !== VERSION) malformed();
  const bits = fromBase36(body.slice(1));
  if (bits === null || bits.length < 32) malformed();
  if (crcBits(bits.slice(32)) !== bits.slice(0, 32)) throw new Refused('checksum');

  const r = new BitReader(bits);
  r.get(32);
  const sharedAt = new Date(EPOCH_MS + r.get(24) * 60_000);
  const year = (semester) => Number(semester.slice(0, 3));

  const regular = r.get(1) === 0;
  const count = r.gamma(MAX_TERMS);
  let order;
  if (regular) {
    const c = r.gamma();
    const d = { 1: 0, 2: -1, 3: 1 }[c] ?? c - 2;
    const kind = r.get(2);
    if (kind === 3) malformed();
    let s = (academicYear(sharedAt) - d) * 3 + kind;
    const slots = [s];
    for (let i = 1; i < count; i++) { s -= r.gamma(); slots.push(s); }
    if (s < 0) malformed();
    order = slots.map((slot) => String(Math.floor(slot / 3)).padStart(3, '0') + KINDS[slot % 3]);
  } else {
    order = [];
    for (let i = 0; i < count; i++) {
      const y = r.get(10);
      const kind = r.get(6);
      if (y > 999 || kind >= 36) malformed();
      order.push(String(y).padStart(3, '0') + A36[kind]);
    }
    for (let i = 1; i < order.length; i++) {
      const [newer, older] = [order[i - 1], order[i]];
      if (year(newer) < year(older) || (year(newer) === year(older) && A36.indexOf(newer[3]) <= A36.indexOf(older[3]))) {
        malformed();
      }
    }
    if (order.every((t) => KINDS.includes(t[3])) && academicYear(sharedAt) - year(order[0]) >= -1) malformed();
  }

  const oldest = Math.min(...order.map(year));
  let studentId;
  if (r.get(1) === 0) {
    let i = 0;
    while (i < LETTERS.length && r.get(1) === 1) i++;
    let letter;
    if (i < LETTERS.length) {
      letter = LETTERS[i];
    } else {
      const x = r.get(5);
      if (x > 25 || LETTERS.includes(String.fromCharCode(65 + x))) malformed();
      letter = String.fromCharCode(65 + x);
    }
    const y = oldest - (r.gamma() - 1);
    const serial = r.get(17);
    if (y < 0 || serial > 99_999) malformed();
    studentId = letter + String(y).padStart(3, '0') + String(serial).padStart(5, '0');
  } else {
    const length = r.gamma(MAX_STUDENT_ID);
    let id = '';
    for (let i = 0; i < length; i++) {
      const x = r.get(6);
      if (x >= 36) malformed();
      id += A36[x];
    }
    const m = STUDENT.exec(id);
    if (m && oldest >= Number(m[2])) malformed();
    studentId = id;
  }

  const known = r.subset(KNOWN_HEADS.length, false);
  const unknownCount = r.gamma() - 1;
  if (unknownCount > HEAD_VALUES - KNOWN_HEADS.length) malformed();
  const unknown = [];
  for (let i = 0; i < unknownCount; i++) unknown.push(r.get(11));
  if (unknown.some((v, i) => v >= HEAD_VALUES || KNOWN_HEADS.includes(headText(v)) || (i > 0 && v <= unknown[i - 1]))) {
    malformed();
  }
  const heads = [...known.map((i) => KNOWN_HEADS[i]), ...unknown.map(headText)];
  if (heads.length === 0) malformed();

  const membership = order.length > 1 && heads.length > 1
    ? heads.map(() => new Set(r.subset(order.length, true)))
    : heads.map(() => new Set(order.map((_, i) => i)));
  const seen = new Set();
  const terms = order.map((semester, t) => {
    const present = heads.map((_, h) => h).filter((h) => membership[h].has(t));
    if (present.length === 0) malformed();
    const counts = present.map(() => r.gamma(MAX_COURSES));
    if (counts.reduce((a, b) => a + b, 0) > MAX_COURSES) malformed();
    const courseNos = [];
    present.forEach((h, index) => {
      let level = null;
      let last = null;
      for (let k = 0; k < counts[index]; k++) {
        const [tail, next] = getTail(r, level);
        level = next;
        if (last !== null && tail <= last) malformed();
        last = tail;
        const m = COURSE.exec(heads[h] + tail);
        if (!m || m[1] !== heads[h] || m[2] !== tail) malformed();
        courseNos.push(heads[h] + tail);
      }
      seen.add(h);
    });
    return { semester, courseNos: courseNos.sort() };
  });
  if (seen.size !== heads.length) malformed();
  if (bits.length - r.used !== padding(r.used) || /1/.test(bits.slice(r.used))) malformed();
  return { studentId, sharedAt, terms };
}

function getTail(r, level) {
  if (r.get(1) === 0) {
    let lv;
    if (level === null) lv = getLevel(r);
    else if (r.get(1) === 0) lv = level;
    else if (r.get(1) === 0) lv = level + 1;
    else {
      lv = getLevel(r);
      if (lv === level || lv === level + 1) malformed();
    }
    const number = r.get(10);
    if (lv > 9 || number > 999) malformed();
    const tail = `${lv}${pad3(number)}${'37'[r.get(1)]}${serial(r)}`;
    return [tail, lv];
  }
  const code = r.get(2);
  if (code < 3) {
    const number = r.get(10);
    if (number > 999) malformed();
    if (code === 0) return [`${pad3(number)}${'AB'[r.get(1)]}0${serial(r)}`, level];
    if (code === 1) return [`G${pad3(number)}3${serial(r)}`, level];
    return [`${pad3(number)}7${serial(r)}`, level];
  }
  let tail;
  let expected;
  if (r.get(1) === 0) {
    const number = r.get(24);
    if (number > 9_999_999) malformed();
    [tail, expected] = [String(number).padStart(7, '0'), 'digits'];
  } else {
    const length = 6 + r.get(1);
    tail = '';
    for (let i = 0; i < length; i++) {
      const x = r.get(6);
      if (x >= 36) malformed();
      tail += A36[x];
    }
    expected = 'other';
  }
  if (shapeOf(tail) !== expected) malformed();
  return [tail, level];
}

function getLevel(r) {
  if (r.get(1) === 0) return r.get(2) + 1;
  if (r.get(1) === 0) return 5;
  const level = r.get(4);
  if ((level >= 1 && level <= 5) || level > 9) malformed();
  return level;
}

const pad3 = (n) => String(n).padStart(3, '0');
const serial = (r) => String(r.gamma(99)).padStart(2, '0');

function shapeOf(tail) {
  for (const [name, pattern] of SHAPES) {
    const m = pattern.exec(tail);
    if (m && Number(m[m.length - 1]) >= 1) return name;
  }
  return /^[0-9]{7}$/.test(tail) ? 'digits' : 'other';
}

/** The ROC academic year of [at] in Taipei, which starts in August. */
function academicYear(at) {
  const local = new Date(at.getTime() + 8 * 3_600_000);
  return local.getUTCFullYear() - 1911 - (local.getUTCMonth() + 1 < 8 ? 1 : 0);
}

function headText(value) {
  if (value >= 676 * 2) return `3${String.fromCharCode(65 + value - 676 * 2)}`;
  return (value >= 676 ? '3' : '') + String.fromCharCode(65 + Math.floor((value % 676) / 26)) + String.fromCharCode(65 + (value % 26));
}

function padding(bits) {
  const r = bits % 31;
  return r > 25 ? 31 - r : (5 - (r % 5)) % 5;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

/** zlib's CRC-32 of the prefix and version, then [data] zero-filled to whole bytes, as 32 bits. */
function crcBits(data) {
  const bytes = [...PREFIX + VERSION].map((ch) => ch.charCodeAt(0));
  for (let i = 0; i < data.length; i += 8) bytes.push(parseInt(data.slice(i, i + 8).padEnd(8, '0'), 2));
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return ((crc ^ 0xffffffff) >>> 0).toString(2).padStart(32, '0');
}

/** Null for a character outside `0-9A-Z` or a group too large for its bits. */
function fromBase36(text) {
  let bits = '';
  for (let start = 0; start < text.length; start += 6) {
    const chunk = text.slice(start, start + 6);
    let group = 0;
    for (const ch of chunk) {
      const digit = A36.indexOf(ch);
      if (digit < 0) return null;
      group = group * 36 + digit;
    }
    const k = chunk.length === 6 ? 31 : 5 * chunk.length;
    if (group >= 2 ** k) return null;
    bits += group.toString(2).padStart(k, '0');
  }
  return bits;
}

/** n choose k, exact past 2^53, which the 56 heads reach. */
function comb(n, k) {
  if (k < 0 || k > n) return 0n;
  let result = 1n;
  for (let i = 0; i < Math.min(k, n - k); i++) result = (result * BigInt(n - i)) / BigInt(i + 1);
  return result;
}

const bitLength = (x) => (x === 0n ? 0 : x.toString(2).length);

class BitReader {
  constructor(bits) { this.bits = bits; this.used = 0; }

  get(k) { return Number(this.big(k)); }

  big(k) {
    if (this.used + k > this.bits.length) malformed();
    const value = k === 0 ? 0n : BigInt(`0b${this.bits.slice(this.used, this.used + k)}`);
    this.used += k;
    return value;
  }

  /** Elias gamma, refused past [limit] or more than 32 leading zeros. */
  gamma(limit = 2 ** 32) {
    let zeros = 0;
    while (this.get(1) === 0) if (++zeros > 32) malformed();
    const x = 2 ** zeros + this.get(zeros);
    if (x > limit) malformed();
    return x;
  }

  subset(n, nonEmpty) {
    const k = nonEmpty ? this.gamma(n) : this.gamma(n + 1) - 1;
    const total = comb(n, k);
    let rank = this.big(bitLength(total - 1n));
    if (rank >= total) malformed();
    const out = [];
    for (let i = k; i >= 1; i--) {
      let c = i - 1;
      while (comb(c + 1, i) <= rank) c++;
      rank -= comb(c, i);
      out.push(c);
    }
    return out.reverse();
  }
}
