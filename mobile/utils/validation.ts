// UX standard #6: validate inline with specific messages, never a
// generic "invalid input." These are pure functions (string in, error
// message or null out) so screens can call them on blur and on submit
// without duplicating the rule itself.

export function validateFullName(value: string): string | null {
  if (value.trim().length === 0) return 'Full name is required';
  return null;
}

// Login doesn't re-check password *strength* (that was already
// enforced at signup) -- it only needs to know the field isn't empty
// before bothering the server with a request that can't possibly work.
export function validateRequired(value: string, fieldLabel: string): string | null {
  if (value.trim().length === 0) return `${fieldLabel} is required`;
  return null;
}

// Cameroon mobile numbers are 9 digits after the +237 country code
// (e.g. 6XX XXX XXX). Accepts the number with or without +237/237
// prefix and ignores spaces, since that's how people naturally type it.
export function validatePhoneNumber(value: string): string | null {
  const digitsOnly = value.replace(/\D/g, '');
  const withoutCountryCode = digitsOnly.startsWith('237') ? digitsOnly.slice(3) : digitsOnly;
  if (withoutCountryCode.length !== 9) {
    return 'Phone number must be 9 digits';
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < 8) return 'Password must be at least 8 characters';
  return null;
}

export function validatePasswordMatch(password: string, confirmPassword: string): string | null {
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
}

export function validateOtpCode(value: string): string | null {
  if (!/^\d{6}$/.test(value)) return 'Enter the 6-digit code';
  return null;
}

// Turns however the user typed their number ("677234567", "+237 677 234 567",
// "237677234567") into one canonical "+237677234567" form before it's
// sent to the backend. Without this, the same person could accidentally
// sign up and log in with what the database sees as two different phone
// numbers just because they typed spaces differently.
export function normalizePhoneNumber(value: string): string {
  const digitsOnly = value.replace(/\D/g, '');
  const withoutCountryCode = digitsOnly.startsWith('237') ? digitsOnly.slice(3) : digitsOnly;
  return `+237${withoutCountryCode}`;
}
