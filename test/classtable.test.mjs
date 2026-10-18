import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PREFIX, Refused, decodeClassTable } from '../public/classtable.js';

// The shared test codes, the iOS side's vectors.txt verbatim; the Android app pins the same ones.
const OCTOBER = '2026-10-13T06:05:00.000Z';
const table = (studentId, sharedAt, terms) => ({
  studentId,
  sharedAt,
  terms: Object.entries(terms).map(([semester, courses]) => ({ semester, courseNos: courses.split(' ').sort() })),
});

const VECTORS = {
  [`${PREFIX}1KNTO5SJB234O09283J89PYINHMLGU86XQH3K2WVREW0CHIZS78`]: table('B00015999', OCTOBER, {
    1151: 'CS2001301 CS2006301 CS2007302 EE2005301 FL1002301 MA2001301 PE1006301 TCG032301',
  }),
  [`${PREFIX}1G7XI6UJ8QNWKLS5E0UHI2L0EHI1B2EDHW5C1YZ7PXCXYT3IPC0N2O`]: table('M00015998', '2026-09-01T00:30:00.000Z', {
    1151: 'CS5140701 CS5164701', '114H': 'CS5001701', 1142: 'BA130A001 CS5003701 EE5428701', 1141: 'AS5140701 CS5001702',
  }),
  [`${PREFIX}16V0RAQJIRG0R158Q9S0000000000005NB6ZK0K`]: table('X0000000000000AB', '2027-03-02T15:59:00.000Z', {
    1152: 'ME3001301',
  }),
  [`${PREFIX}1XGGDD7JB234OQP6KRJAJKY0XNM3APH8VOQPLT62AKG4SF7KU24A8E42KE99404OK5DJHPM2O2U`]: table('D00015997', OCTOBER, {
    1151: '3CS3003302 3CS3003303 3N1004701 3NG115701 3T5287701 3TG015301 CS1001001 CS1A01B01 ZZ0000099',
  }),
  [`${PREFIX}17BPXMX1JS2NCFYLE9U09283GA1GT3S010`]: table('B00015996', OCTOBER, { 1153: 'CS1001301', 1151: 'CS1002301' }),
  [`${PREFIX}1ERD6XSJB23426AEQL89YN8G8ENJHIUYV1CVF8BF86UHR4KLJ88VXJZRFO3KFSX2QHYJYG9BOJOB2XWQLXLS49F409I1Z6BYO1M4LDZQ8K2M` +
    '9EKQFHPO59M1J17JQ34H3P6787KL6Q341Q7OFEJTM8E27AK5G00TL3BMMTZEL3Y448998XL2XOIRY2LM600KJ0WI35C0DQHDS54SM4GCM039' +
    'FF7ZKSN4HJHG602CAB40N3KRK1KL2VRJZD19RQ9OGXE44EOYOV7UZ296NUAL0T57E6GVC4JF60HNGWB4LWT1EQN0CUJHSWI9M']: table('B00015995', OCTOBER, {
    1152: '3N7113701 FL4994701 PE113B031 TCG028301 TCG116301 TCG126301 TCG132301 TCG141301 TCG147301 TCG151301',
    1151: '3NG304701 FL2062301 GD213A001 PE114A041 TC2002701 TCG111301 TCG123301 TCG127301 TCG130301 TCG136302',
    1142: '3T6736701 FL3922701 PE139B043 TCG030301 TCG118302 TCG134301 TCG162302 TCG177301 TCG182301 TCG190301',
    1141: 'FL2003303 PE127A051 PE128A021 TC2001701 TCG100301 TCG103301 TCG113301 TCG120301 TCG161302 TCG180301',
    1132: '3TG096701 AT3926701 FL4995701 PE113B052 TC2001701 TC2002701 TC2003701 TC2004702 TC2005701 TC2005702',
    1131: 'FL3833703 FN6906701 PE114A022 TC2002701 TC2003701 TC2004701 TC2004702 TC2005701 TC2005702 TCG115301',
    1122: '3N1142701 3N2763701 AC5715701 FL3801701 MG6905701 PE112B053 TC1004701 TC1005701 TC1010301 TCG132301',
    1121: 'AD5225701 EC163A001 FL5257701 MB2102301 ME3801303 PE128A011 TC1004701 TC1005701 TC1010301 TCG143302',
  }),
};

// Object.entries lists integer-like keys in ascending order: put each table's terms newest first.
const newestFirst = (t) => ({
  ...t,
  terms: [...t.terms].sort((a, b) => b.semester.slice(0, 3) - a.semester.slice(0, 3) ||
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(b.semester[3]) - '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(a.semester[3])),
});

const reason = (code) => {
  try {
    decodeClassTable(code);
    return null;
  } catch (error) {
    assert.ok(error instanceof Refused, `${code}: ${error}`);
    return error.reason;
  }
};

test('the shared vectors decode to their tables, in any letter case', () => {
  for (const [code, expected] of Object.entries(VECTORS)) {
    const decoded = decodeClassTable(code);
    assert.deepEqual({ ...decoded, sharedAt: decoded.sharedAt.toISOString() }, newestFirst(expected));
    assert.equal(decodeClassTable(` ${code.toLowerCase()}\n`).studentId, expected.studentId);
  }
});

test('the shared refused codes are refused for their reasons', () => {
  const one = Object.keys(VECTORS)[0];
  assert.equal(reason(`${PREFIX}2${one.slice(PREFIX.length + 1)}`), 'newer');
  assert.equal(reason(`${PREFIX}1KNTO5SJB234O09283J89PYINHMLGU86XQH3K2WVREW0CHIZA78`), 'checksum');
  assert.equal(reason(`${PREFIX}HELLO`), 'malformed');
  for (const version of ['0', 'A', '']) assert.equal(reason(`${PREFIX}${version}${one.slice(PREFIX.length + 1)}`), 'malformed');
});

test('every one-character change and every cut of a vector is refused', () => {
  const A36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const code of Object.keys(VECTORS)) {
    for (let i = PREFIX.length; i < code.length; i++) {
      for (const ch of A36) {
        if (ch === code[i]) continue;
        assert.notEqual(reason(code.slice(0, i) + ch + code.slice(i + 1)), null, `changed at ${i}`);
      }
    }
    for (let length = PREFIX.length; length < code.length; length++) {
      assert.notEqual(reason(code.slice(0, length)), null, `cut at ${length}`);
    }
  }
});
