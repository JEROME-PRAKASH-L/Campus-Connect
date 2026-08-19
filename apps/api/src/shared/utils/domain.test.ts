import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GRADE_POINTS, cgpaFrom, countsAsPresent, countsInDenominator, gradeFor, internalTotal, percentage } from './domain.js';

describe('attendance counting', () => {
  it('counts an on-duty period as attended', () => {
    assert.equal(countsAsPresent('PRESENT'), true);
    assert.equal(countsAsPresent('ON_DUTY'), true);
    assert.equal(countsAsPresent('ABSENT'), false);
    assert.equal(countsAsPresent('LEAVE'), false);
  });

  it('removes approved leave from the denominator entirely', () => {
    assert.equal(countsInDenominator('PRESENT'), true);
    assert.equal(countsInDenominator('ABSENT'), true);
    assert.equal(countsInDenominator('ON_DUTY'), true);
    assert.equal(countsInDenominator('LEAVE'), false);
  });

  it('reports a percentage to one decimal place', () => {
    assert.equal(percentage(47, 52), 90.4);
    assert.equal(percentage(0, 10), 0);
  });

  it('reports zero rather than dividing by zero before any class is held', () => {
    assert.equal(percentage(0, 0), 0);
  });
});

describe('grading', () => {
  it('bands a total to the institute grade', () => {
    assert.equal(gradeFor(95), 'O');
    assert.equal(gradeFor(91), 'O');
    assert.equal(gradeFor(90), 'A+');
    assert.equal(gradeFor(81), 'A+');
    assert.equal(gradeFor(80), 'A');
    assert.equal(gradeFor(71), 'A');
    assert.equal(gradeFor(70), 'B+');
    assert.equal(gradeFor(61), 'B+');
    assert.equal(gradeFor(60), 'B');
    assert.equal(gradeFor(56), 'B');
    assert.equal(gradeFor(55), 'C');
    assert.equal(gradeFor(50), 'C');
    assert.equal(gradeFor(49), 'RA');
  });

  it('scores a re-appear at zero grade points', () => {
    assert.equal(GRADE_POINTS.RA, 0);
    assert.equal(GRADE_POINTS.O, 10);
  });
});

describe('internal totals', () => {
  it('scores a practical off the practical mark alone', () => {
    assert.equal(internalTotal('PRACTICAL', { internal1: null, internal2: null, assignment: null, practical: 47 }), Math.round((47 / 50) * 40) + 44);
  });

  it('blends both internal assessments and the assignment for a theory subject', () => {
    // avgIA 42.5 → 26 (of 30) + assignment 18/20 → 9 (of 10) + the 0.98-scaled
    // written component 42.5/50 × 60 × 0.98 → 50.
    const total = internalTotal('THEORY', { internal1: 44, internal2: 41, assignment: 18, practical: null });
    assert.equal(total, 26 + 9 + 50);
  });

  it('rises monotonically with the internal assessment marks', () => {
    const lower = internalTotal('THEORY', { internal1: 30, internal2: 30, assignment: 10, practical: null });
    const higher = internalTotal('THEORY', { internal1: 45, internal2: 45, assignment: 18, practical: null });
    assert.ok(higher > lower, `${higher} should exceed ${lower}`);
  });

  it('treats a missing mark sheet as zero rather than throwing', () => {
    assert.equal(internalTotal('THEORY', null), 0);
    assert.equal(internalTotal('THEORY', { internal1: null, internal2: null, assignment: null, practical: null }), 0);
  });
});

describe('CGPA', () => {
  it('weights each semester GPA by its credits', () => {
    assert.equal(cgpaFrom([{ gpa: 8, credits: 20 }, { gpa: 9, credits: 20 }]), 8.5);
    assert.equal(cgpaFrom([{ gpa: 8, credits: 10 }, { gpa: 9, credits: 30 }]), 8.75);
  });

  it('is zero before any semester is published', () => {
    assert.equal(cgpaFrom([]), 0);
    assert.equal(cgpaFrom([{ gpa: 9, credits: 0 }]), 0);
  });
});
