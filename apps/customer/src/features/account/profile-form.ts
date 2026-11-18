/** The profile fields' rules, shared by the onboarding step and Edit profile. Pure, so it's tested. */

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
/** Days in each month, February with the 29th (a birthday, not a date in a given year). */
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export type ProfileDraft = { name: string; month: number | null; day: string; city: string; marketing: boolean };

export type ProfileErrors = { name: string | null; birthday: string | null };

export function validateProfile(draft: ProfileDraft): ProfileErrors {
  const name = draft.name.trim();
  const day = draft.day.trim();
  let birthday: string | null = null;
  if (draft.month !== null || day !== '') {
    const dayNumber = Number(day);
    if (draft.month === null) birthday = 'Pick the month too, or clear the day.';
    else if (day === '' || !Number.isInteger(dayNumber)) birthday = 'Add the day of the month, or clear the month.';
    else if (dayNumber < 1 || dayNumber > DAYS_IN_MONTH[draft.month - 1]) birthday = `${MONTHS[draft.month - 1]} has days 1 to ${DAYS_IN_MONTH[draft.month - 1]}.`;
  }
  return { name: name.length < 2 ? 'Enter your name (at least 2 letters).' : name.length > 80 ? 'Keep your name under 80 characters.' : null, birthday };
}

export function isValid(errors: ProfileErrors): boolean {
  return errors.name === null && errors.birthday === null;
}

/** The columns to save for a valid draft. */
export function profileColumns(draft: ProfileDraft) {
  const hasBirthday = draft.month !== null && draft.day.trim() !== '';
  return {
    display_name: draft.name.trim(),
    birthday_month: hasBirthday ? draft.month : null,
    birthday_day: hasBirthday ? Number(draft.day.trim()) : null,
    city: draft.city.trim() || null,
  };
}
