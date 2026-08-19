import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ROLES } from '@campus-connect/contracts';
import { isRouteAllowed, navFor } from './navigation';

/**
 * The sidebar is the visible half of access control, so it is pinned here: every
 * role keeps its screens, and no role gains one it should not reach.
 */
describe('role navigation', () => {
  it('gives every role a dashboard and settings', () => {
    for (const role of ROLES) {
      const keys = navFor(role).map((i) => i.key);
      assert.ok(keys.includes('dashboard'), `${role} lost the dashboard`);
      assert.ok(keys.includes('settings'), `${role} lost settings`);
    }
  });

  it('keeps the student sidebar as designed', () => {
    assert.deepEqual(
      navFor('STUDENT').map((i) => i.key),
      ['dashboard', 'profile', 'attendance', 'timetable', 'academics', 'assignments', 'examinations', 'results', 'fees', 'leave', 'materials', 'notifications', 'calendar', 'placement', 'settings'],
    );
  });

  it('keeps the parent view read-only in scope', () => {
    const keys = navFor('PARENT').map((i) => i.key);
    assert.deepEqual(keys, ['dashboard', 'profile', 'attendance', 'timetable', 'results', 'examinations', 'fees', 'notifications', 'calendar', 'settings']);
    assert.equal(keys.includes('people'), false);
    assert.equal(keys.includes('administration'), false);
    assert.equal(keys.includes('reports'), false);
  });

  it('offers administration only to the two roles that manage master data', () => {
    for (const role of ROLES) {
      assert.equal(isRouteAllowed(role, 'administration'), role === 'ADMIN' || role === 'HOD', `administration wrong for ${role}`);
    }
  });

  it('keeps People away from students and parents', () => {
    assert.equal(isRouteAllowed('STUDENT', 'people'), false);
    assert.equal(isRouteAllowed('PARENT', 'people'), false);
    assert.equal(isRouteAllowed('FACULTY', 'people'), true);
  });

  it('gives every navigation item a label and an icon', () => {
    for (const role of ROLES) {
      for (const item of navFor(role)) {
        assert.ok(item.label.length > 0, `${role}/${item.key} has no label`);
        assert.ok(item.icon.length > 0, `${role}/${item.key} has no icon`);
      }
    }
  });
});
