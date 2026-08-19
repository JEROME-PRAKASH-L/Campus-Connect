import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toCsv } from './csv.js';

const columns = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
];

describe('CSV export', () => {
  it('writes a header row followed by the data', () => {
    assert.equal(toCsv(columns, [{ code: 'CSE', name: 'Computer Science' }]), 'Code,Name\nCSE,Computer Science\n');
  });

  it('quotes a value containing a comma, quote or newline', () => {
    assert.equal(toCsv(columns, [{ code: 'A,B', name: 'He said "hi"' }]), 'Code,Name\n"A,B","He said ""hi"""\n');
  });

  it('neutralises a value a spreadsheet would treat as a formula', () => {
    const csv = toCsv(columns, [{ code: '=1+1', name: '@SUM(A1)' }]);
    assert.equal(csv, "Code,Name\n'=1+1,'@SUM(A1)\n");
  });

  it('renders a missing value as an empty cell', () => {
    assert.equal(toCsv(columns, [{ code: 'X' }]), 'Code,Name\nX,\n');
  });
});
