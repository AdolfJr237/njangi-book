import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  type ConfirmationResult,
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let confirmation: ConfirmationResult | null = null;
let verifier: RecaptchaVerifier | null = null;

function getFirebaseAuth() {
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error('Firebase is not configured for this web build.');
  }
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getAuth(app);
}

function getRecaptchaVerifier(): RecaptchaVerifier {
  if (verifier) return verifier;
  const element = document.getElementById('firebase-recaptcha-container');
  if (!element) throw new Error('Phone verification is still loading. Please try again.');
  verifier = new RecaptchaVerifier(getFirebaseAuth(), element, { size: 'invisible' });
  return verifier;
}

export async function prepareFirebasePhoneVerification(): Promise<void> {
  // Constructing it after the screen renders lets Firebase attach its abuse
  // protection to this exact DOM element. The widget is invisible, but it can
  // present a challenge if Firebase detects suspicious traffic.
  getRecaptchaVerifier();
}

export async function sendFirebasePhoneCode(phoneNumber: string): Promise<void> {
  confirmation = await signInWithPhoneNumber(getFirebaseAuth(), phoneNumber, getRecaptchaVerifier());
}

export async function confirmFirebasePhoneCode(code: string): Promise<string> {
  if (!confirmation) throw new Error('Request a verification code first.');
  const credential = await confirmation.confirm(code);
  return credential.user.getIdToken(true);
}

export async function clearFirebasePhoneSession(): Promise<void> {
  confirmation = null;
  verifier?.clear();
  verifier = null;
  await signOut(getFirebaseAuth());
}
