import Constants from 'expo-constants';

type PhoneConfirmation = {
  confirm: (code: string) => Promise<{ user: { getIdToken: (forceRefresh?: boolean) => Promise<string> } }>;
};

let confirmation: PhoneConfirmation | null = null;

function getNativeFirebaseAuth() {
  // Expo Go cannot contain RNFBAppModule. Keep this require inside the
  // function so Expo Router can still load every route in Expo Go; the user
  // gets a clear recovery limitation only if they actually try this feature.
  if (Constants.executionEnvironment === 'storeClient') {
    throw new Error('Phone verification requires the NjangiBook Android development build, not Expo Go.');
  }
  return require('@react-native-firebase/auth') as typeof import('@react-native-firebase/auth');
}

export async function prepareFirebasePhoneVerification(): Promise<void> {
  // Native Firebase handles Android's Play Integrity/reCAPTCHA verification.
  // There is no visible web reCAPTCHA container on a native Android screen.
}

export async function sendFirebasePhoneCode(phoneNumber: string): Promise<void> {
  const { getAuth, signInWithPhoneNumber } = getNativeFirebaseAuth();
  confirmation = (await signInWithPhoneNumber(getAuth(), phoneNumber)) as PhoneConfirmation;
}

export async function confirmFirebasePhoneCode(code: string): Promise<string> {
  if (!confirmation) throw new Error('Request a verification code first.');
  const credential = await confirmation.confirm(code);
  return credential.user.getIdToken(true);
}

export async function clearFirebasePhoneSession(): Promise<void> {
  confirmation = null;
  const { getAuth, signOut } = getNativeFirebaseAuth();
  await signOut(getAuth());
}
