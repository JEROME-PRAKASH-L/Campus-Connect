import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { attendanceTone, money, relativeTime, titleCase, toneTag, toneVar } from './format';

describe('formatting', () => {
  it('renders rupees in the Indian grouping', () => {
    assert.equal(money(1500), '₹1,500');
    assert.equal(money(125000), '₹1,25,000');
    assert.equal(money(0), '₹0');
  });

  it('bands attendance to the colour the design specifies', () => {
    assert.equal(attendanceTone(92), 'var(--status-ok)');
    assert.equal(attendanceTone(85), 'var(--status-ok)');
    assert.equal(attendanceTone(80), 'var(--color-accent)');
    assert.equal(attendanceTone(75), 'var(--color-accent)');
    assert.equal(attendanceTone(74.9), 'var(--status-bad)');
  });

  it('maps a tone to its variable and tag class', () => {
    assert.equal(toneVar('OK'), 'var(--status-ok)');
    assert.equal(toneVar('BAD'), 'var(--status-bad)');
    assert.equal(toneVar('ANYTHING_ELSE'), 'var(--color-accent)');
    assert.equal(toneTag('WARN'), 'tag-neutral');
    assert.equal(toneTag('OK'), 'tag-accent');
  });

  it('turns an enum member into prose', () => {
    assert.equal(titleCase('ON_DUTY'), 'On duty');
    assert.equal(titleCase('PRESENT'), 'Present');
  });

  it('describes a recent timestamp relatively', () => {
    const now = Date.now();
    assert.equal(relativeTime(new Date(now - 10_000)), 'Just now');
    assert.equal(relativeTime(new Date(now - 60_000)), '1 minute ago');
    assert.equal(relativeTime(new Date(now - 5 * 60_000)), '5 minutes ago');
    assert.equal(relativeTime(new Date(now - 2 * 3_600_000)), '2 hours ago');
    assert.equal(relativeTime(new Date(now - 26 * 3_600_000)), 'Yesterday');
  });
});
