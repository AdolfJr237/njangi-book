// TypeScript resolves this neutral file during `tsc --noEmit`. Metro resolves
// the platform-specific .native.ts or .web.ts sibling at runtime instead.
export {
  clearFirebasePhoneSession,
  confirmFirebasePhoneCode,
  prepareFirebasePhoneVerification,
  sendFirebasePhoneCode,
} from './firebasePhoneAuth.native';
