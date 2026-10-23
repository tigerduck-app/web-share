// QR codes of the share link, for a computer to show the phone that will open it: byte mode,
// error correction level M, version 1 to 40. Made here, in the browser, as the link holds a
// student ID and courses: no service ever sees it. The tests pin it to what ZXing makes.
//
// After Project Nayuki's QR Code generator library, https://www.nayuki.io/page/qr-code-generator-library
//
// Copyright (c) Project Nayuki. (MIT License)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
// associated documentation files (the "Software"), to deal in the Software without restriction,
// including without limitation the rights to use, copy, modify, merge, publish, distribute,
// sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// - The above copyright notice and this permission notice shall be included in all copies or
//   substantial portions of the Software.
// - The Software is provided "as is", without warranty of any kind, express or implied, including
//   but not limited to the warranties of merchantability, fitness for a particular purpose and
//   noninfringement. In no event shall the authors or copyright holders be liable for any claim,
//   damages or other liability, whether in an action of contract, tort or otherwise, arising from,
//   out of or in connection with the Software or the use or other dealings in the Software.

/** The text does not fit the largest code. */
export class TooLong extends Error {}

// Level M's, by version; index 0 is unused.
const ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26,
  26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
const BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20,
  21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
/** Level M in the format information. */
const LEVEL_M = 0;

/**
 * [text]'s QR code, row by row, dark as true and no quiet zone: the smallest version it fits, under
 * [mask], or the mask the standard's penalty rules score best.
 */
export function qrCode(text: string, mask?: number): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const version = versionFor(bytes.length);
  const code = new Grid(version);
  code.drawCodewords(withErrorCorrection(dataCodewords(bytes, version), version));
  let chosen = mask ?? 0;
  if (mask === undefined) {
    let best = Infinity;
    for (let candidate = 0; candidate < 8; candidate++) {
      code.applyMask(candidate);
      code.drawFormat(candidate);
      const score = penalty(code.modules);
      if (score < best) [best, chosen] = [score, candidate];
      code.applyMask(candidate);
    }
  }
  code.applyMask(chosen);
  code.drawFormat(chosen);
  return code.modules;
}

/**
 * An SVG path of [modules]' dark ones, offset by [border] for the quiet zone, a run of them in a
 * row as one rectangle.
 */
export function svgPath(modules: boolean[][], border: number): string {
  let path = '';
  modules.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      const start = x;
      while (x + 1 < row.length && row[x + 1]) x++;
      const run = x - start + 1;
      path += `M${start + border},${y + border}h${run}v1h-${run}z`;
    }
  });
  return path;
}

function rawModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const alignments = Math.floor(version / 7) + 2;
    result -= (25 * alignments - 10) * alignments - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

const dataCapacity = (version: number) =>
  Math.floor(rawModules(version) / 8) - ECC_PER_BLOCK[version] * BLOCKS[version];

/** The width of byte mode's character count. */
const countBits = (version: number) => (version < 10 ? 8 : 16);

function versionFor(length: number): number {
  for (let version = 1; version <= 40; version++) {
    if (4 + countBits(version) + length * 8 <= dataCapacity(version) * 8) return version;
  }
  throw new TooLong(`${length} bytes do not fit a QR code`);
}

/** One byte mode segment, its terminator and the padding, as codewords. */
function dataCodewords(bytes: Uint8Array, version: number): number[] {
  const bits: number[] = [];
  const append = (value: number, width: number) => {
    for (let i = width - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  append(0b0100, 4);
  append(bytes.length, countBits(version));
  bytes.forEach((byte) => append(byte, 8));
  const capacity = dataCapacity(version) * 8;
  append(0, Math.min(4, capacity - bits.length));
  append(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) append(pad, 8);
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) codewords.push(bits.slice(i, i + 8).reduce((byte, bit) => (byte << 1) | bit, 0));
  return codewords;
}

/** [data] split into the version's blocks, each with its Reed-Solomon codewords, interleaved. */
function withErrorCorrection(data: number[], version: number): number[] {
  const blockCount = BLOCKS[version];
  const eccLength = ECC_PER_BLOCK[version];
  const raw = Math.floor(rawModules(version) / 8);
  const shortBlocks = blockCount - (raw % blockCount);
  const shortLength = Math.floor(raw / blockCount);
  const divisor = reedSolomonDivisor(eccLength);
  const blocks: number[][] = [];
  for (let i = 0, start = 0; i < blockCount; i++) {
    const block = data.slice(start, start + shortLength - eccLength + (i < shortBlocks ? 0 : 1));
    start += block.length;
    const ecc = reedSolomonRemainder(block, divisor);
    // A place a short block leaves empty, skipped below.
    if (i < shortBlocks) block.push(0);
    blocks.push(block.concat(ecc));
  }
  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortLength - eccLength || j >= shortBlocks) result.push(block[i]);
    });
  }
  return result;
}

/** x × y in GF(2⁸) modulo x⁸ + x⁴ + x³ + x² + 1. */
function multiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function reedSolomonDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = multiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = multiply(root, 0x02);
  }
  return result;
}

function reedSolomonRemainder(data: number[], divisor: number[]): number[] {
  const result = divisor.map(() => 0);
  for (const byte of data) {
    const factor = byte ^ result.shift()!;
    result.push(0);
    divisor.forEach((coefficient, i) => { result[i] ^= multiply(coefficient, factor); });
  }
  return result;
}

/** A version's modules, with the function patterns drawn and the modules they take marked. */
class Grid {
  readonly size: number;
  readonly modules: boolean[][];
  private readonly reserved: boolean[][];

  constructor(version: number) {
    const size = version * 4 + 17;
    this.size = size;
    this.modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
    this.reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
    for (let i = 0; i < size; i++) {
      this.set(6, i, i % 2 === 0);
      this.set(i, 6, i % 2 === 0);
    }
    for (const [x, y] of [[3, 3], [size - 4, 3], [3, size - 4]]) this.drawFinder(x, y);
    const positions = alignmentPositions(version, size);
    const last = positions.length - 1;
    positions.forEach((y, i) => positions.forEach((x, j) => {
      // The three corners a finder already holds.
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) this.set(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }));
    // Reserved now, drawn for real once the mask is chosen.
    this.drawFormat(0);
    if (version >= 7) this.drawVersion(version);
  }

  private set(x: number, y: number, dark: boolean) {
    this.modules[y][x] = dark;
    this.reserved[y][x] = true;
  }

  private drawFinder(cx: number, cy: number) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) continue;
        const ring = Math.max(Math.abs(dx), Math.abs(dy));
        this.set(x, y, ring !== 2 && ring !== 4);
      }
    }
  }

  drawFormat(mask: number) {
    const data = (LEVEL_M << 3) | mask;
    let remainder = data;
    for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    const bits = ((data << 10) | remainder) ^ 0x5412;
    const bit = (i: number) => ((bits >>> i) & 1) === 1;
    const size = this.size;
    for (let i = 0; i <= 5; i++) this.set(8, i, bit(i));
    this.set(8, 7, bit(6));
    this.set(8, 8, bit(7));
    this.set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) this.set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) this.set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) this.set(8, size - 15 + i, bit(i));
    // The module that is always dark.
    this.set(8, size - 8, true);
  }

  private drawVersion(version: number) {
    let remainder = version;
    for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    const bits = (version << 12) | remainder;
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.set(a, b, dark);
      this.set(b, a, dark);
    }
  }

  /** [codewords] in the zigzag, two columns at a time from the bottom right, skipping the timing column. */
  drawCodewords(codewords: number[]) {
    let i = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vertical = 0; vertical < this.size; vertical++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vertical : vertical;
          if (!this.reserved[y][x] && i < codewords.length * 8) {
            this.modules[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
            i++;
          }
        }
      }
    }
  }

  /** Flips the data modules [mask] picks; applied twice, it undoes itself. */
  applyMask(mask: number) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!this.reserved[y][x] && masked(mask, x, y)) this.modules[y][x] = !this.modules[y][x];
      }
    }
  }
}

function masked(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: throw new RangeError(`mask ${mask}`);
  }
}

function alignmentPositions(version: number, size: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = Math.floor((version * 8 + count * 3 + 5) / (count * 4 - 4)) * 2;
  const result = [6];
  for (let position = size - 7; result.length < count; position -= step) result.splice(1, 0, position);
  return result;
}

/** The standard's penalty for [modules]: long runs, 2×2 blocks, finder look-alikes and imbalance. */
function penalty(modules: boolean[][]): number {
  const size = modules.length;
  let result = 0;
  const lines = (at: (line: number, i: number) => boolean) => {
    for (let line = 0; line < size; line++) {
      let color = false;
      let run = 0;
      const history = [0, 0, 0, 0, 0, 0, 0];
      for (let i = 0; i < size; i++) {
        if (at(line, i) === color) {
          run++;
          if (run === 5) result += 3;
          else if (run > 5) result++;
        } else {
          addRun(run, history, size);
          if (!color) result += finderLike(history) * 40;
          color = at(line, i);
          run = 1;
        }
      }
      if (color) {
        addRun(run, history, size);
        run = 0;
      }
      addRun(run + size, history, size);
      result += finderLike(history) * 40;
    }
  };
  lines((y, x) => modules[y][x]);
  lines((x, y) => modules[y][x]);
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const color = modules[y][x];
      if (color === modules[y][x + 1] && color === modules[y + 1][x] && color === modules[y + 1][x + 1]) result += 3;
    }
  }
  const dark = modules.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  const total = size * size;
  result += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return result;
}

function addRun(run: number, history: number[], size: number) {
  // The first run starts at the light border outside the code.
  if (history[0] === 0) run += size;
  history.pop();
  history.unshift(run);
}

/** How many finder look-alikes, 1:1:3:1:1 with light on either side, the last runs end. */
function finderLike(history: number[]): number {
  const n = history[1];
  const core = n > 0 && history[2] === n && history[3] === n * 3 && history[4] === n && history[5] === n;
  return (core && history[0] >= n * 4 && history[6] >= n ? 1 : 0) + (core && history[6] >= n * 4 && history[0] >= n ? 1 : 0);
}
