import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ROLES, ROLE_PERMISSIONS, can, rolesWith } from '@campus-connect/contracts';

/**
 * The permission matrix is the contract the API enforces and the web app renders
 * against. These lock in the boundaries the brief specifies for each role.
 */
describe('role permissions', () => {
  it('keeps all five roles', () => {
    assert.deepEqual([...ROLES], ['STUDENT', 'FACULTY', 'HOD', 'ADMIN', 'PARENT']);
  });

  it('gives the administrator everything', () => {
    for (const role of ROLES) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        assert.ok(can('ADMIN', permission), `ADMIN is missing ${permission}`);
      }
    }
  });

  it('keeps a parent read-only on their ward', () => {
    assert.ok(can('PARENT', 'student:read-own'));
    assert.ok(can('PARENT', 'attendance:read'));
    assert.ok(can('PARENT', 'result:read'));
    assert.equal(can('PARENT', 'student:write-own'), false);
    assert.equal(can('PARENT', 'attendance:write'), false);
    assert.equal(can('PARENT', 'marks:write'), false);
    assert.equal(can('PARENT', 'student:read'), false);
  });

  it('lets a student act only on their own record', () => {
    assert.ok(can('STUDENT', 'student:write-own'));
    assert.ok(can('STUDENT', 'assignment:submit'));
    assert.ok(can('STUDENT', 'leave:apply'));
    assert.equal(can('STUDENT', 'student:read'), false);
    assert.equal(can('STUDENT', 'marks:write'), false);
    assert.equal(can('STUDENT', 'report:read'), false);
  });

  it('lets faculty enter but not define', () => {
    assert.ok(can('FACULTY', 'attendance:write'));
    assert.ok(can('FACULTY', 'marks:write'));
    assert.ok(can('FACULTY', 'material:write'));
    assert.ok(can('FACULTY', 'leave:decide'));
    assert.equal(can('FACULTY', 'subject:write'), false);
    assert.equal(can('FACULTY', 'attendance:correct'), false);
    assert.equal(can('FACULTY', 'user:write'), false);
  });

  it('gives an HOD department authority without institute authority', () => {
    assert.ok(can('HOD', 'subject:write'));
    assert.ok(can('HOD', 'timetable:write'));
    assert.ok(can('HOD', 'attendance:correct'));
    assert.ok(can('HOD', 'marks:approve'));
    assert.ok(can('HOD', 'programme:read'));
    assert.equal(can('HOD', 'user:write'), false);
    assert.equal(can('HOD', 'audit:read'), false);
    assert.equal(can('HOD', 'institution:write'), false);
    assert.equal(can('HOD', 'fee:write'), false);
  });

  it('reserves the audit trail and settings for the administrator', () => {
    assert.deepEqual(rolesWith('audit:read'), ['ADMIN']);
    assert.deepEqual(rolesWith('settings:write'), ['ADMIN']);
    assert.deepEqual(rolesWith('institution:write'), ['ADMIN']);
  });

  it('never grants a write without the matching read', () => {
    for (const role of ROLES) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        if (!permission.endsWith(':write')) continue;
        const read = permission.replace(/:write$/, ':read') as typeof permission;
        if (!rolesWith(read).length) continue;
        assert.ok(can(role, read), `${role} may ${permission} but not ${read}`);
      }
    }
  });
});
