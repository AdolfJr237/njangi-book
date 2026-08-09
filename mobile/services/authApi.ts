import { apiRequest } from '@/services/apiClient';

// Mirrors backend/app/schemas/user.py's UserOut -- same fields, same
// names, since this is exactly the JSON the backend sends back.
export type User = {
  id: number;
  full_name: string;
  phone_number: string;
  photo_url: string | null;
};

// Mirrors backend/app/schemas/auth.py's TokenResponse.
type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export function signup(fullName: string, phoneNumber: string, password: string) {
  return apiRequest<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: { full_name: fullName, phone_number: phoneNumber, password },
  });
}

export function login(phoneNumber: string, password: string) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { phone_number: phoneNumber, password },
  });
}

/** Used on app startup to check a stored token is still valid, and to
 * refresh the user's profile data. */
export function getCurrentUser(token: string) {
  return apiRequest<User>('/auth/me', { token });
}

/**
 * For a logged-in user who knows their current password and wants to
 * change it -- different from the OTP-based reset flow in
 * passwordResetApi.ts, which is for someone locked out with no other
 * way to prove who they are. Returns a fresh token (the backend
 * invalidates every token issued before this change, including the one
 * used to make this very request), so the caller must swap its stored
 * token for the one in this response -- see AuthContext.updateSession.
 */
export function changePassword(currentPassword: string, newPassword: string, token: string) {
  return apiRequest<AuthResponse>('/auth/change-password', {
    method: 'POST',
    token,
    body: { current_password: currentPassword, new_password: newPassword },
  });
}
