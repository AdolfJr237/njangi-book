import { apiRequest } from '@/services/apiClient';

type PasswordResetMessage = {
  message: string;
};

// Firebase proves phone control locally. The backend verifies its signed ID
// token and derives the phone number from that token, never from client JSON.
export function resetPasswordWithFirebase(firebaseIdToken: string, newPassword: string) {
  return apiRequest<PasswordResetMessage>('/auth/firebase-reset', {
    method: 'POST',
    body: { firebase_id_token: firebaseIdToken, new_password: newPassword },
  });
}
