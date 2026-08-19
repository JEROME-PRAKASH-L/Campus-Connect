import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateLoginId, initialsFor, roleLabelFor } from './identity.js';

describe('identity helpers', () => {
  it('takes the first two initials of a name', () => {
    assert.equal(initialsFor('Donald Trump'), 'DT');
    assert.equal(initialsFor('Dr. Kim Jong Un'), 'DK');
    assert.equal(initialsFor('Prakash'), 'P');
  });

  it('falls back rather than producing an empty avatar', () => {
    assert.equal(initialsFor('   '), 'DM');
  });

  it('labels every role', () => {
    assert.equal(roleLabelFor('HOD'), 'Head of Dept.');
    assert.equal(roleLabelFor('ADMIN'), 'Administrator');
  });

  it('generates a four-digit login id behind the given prefix', () => {
    const id = generateLoginId('26CSE');
    assert.match(id, /^26CSE\d{4}$/);
  });
});
