/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { profileColumns, validateProfile, type ProfileDraft } from './profile-form.ts';

const draft = (changes: Partial<ProfileDraft>): ProfileDraft => ({ name: 'Maria', month: null, day: '', city: '', marketing: false, ...changes });

test('a name is required; the birthday is optional', () => {
  assert.equal(validateProfile(draft({ name: ' ' })).name !== null, true);
  assert.deepEqual(validateProfile(draft({})), { name: null, birthday: null });
});

test('a birthday needs both parts and a real day of that month (Feb 29 allowed)', () => {
  assert.notEqual(validateProfile(draft({ month: 4 })).birthday, null);
  assert.notEqual(validateProfile(draft({ day: '12' })).birthday, null);
  assert.notEqual(validateProfile(draft({ month: 4, day: '31' })).birthday, null);
  assert.equal(validateProfile(draft({ month: 2, day: '29' })).birthday, null);
});

test('columns trim, and an empty city or birthday saves as null', () => {
  assert.deepEqual(profileColumns(draft({ name: ' Maria ', month: 2, day: '29', city: ' Naga ' })), { display_name: 'Maria', birthday_month: 2, birthday_day: 29, city: 'Naga' });
  assert.deepEqual(profileColumns(draft({})), { display_name: 'Maria', birthday_month: null, birthday_day: null, city: null });
});
