import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { departmentCreateSchema, studentSelfUpdateSchema } from '@campus-connect/contracts';
import { validateWith } from './validate';

describe('browser-side validation', () => {
  it('accepts a well-formed payload', () => {
    const result = validateWith(departmentCreateSchema, { code: 'CSE', name: 'Computer Science' });
    assert.equal(result.ok, true);
  });

  it('reports one message per field, keyed by path', () => {
    const result = validateWith(departmentCreateSchema, { code: '', name: '' });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.fieldErrors.code);
    assert.ok(result.fieldErrors.name);
    assert.ok(result.message.length > 0);
  });

  it('rejects a key the schema does not declare, so a form cannot over-post', () => {
    const result = validateWith(studentSelfUpdateSchema, { mobile: '+91 98765 43210', sectionId: 'other-section' });
    assert.equal(result.ok, false);
  });

  it('accepts the fields a student may actually change', () => {
    const result = validateWith(studentSelfUpdateSchema, { mobile: '+91 98765 43210', residence: 'Day scholar' });
    assert.equal(result.ok, true);
  });
});
