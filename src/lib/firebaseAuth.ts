import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCkdlD2Qxy1W2nlkbkvhK1UYoEVzJJO-FM',
  authDomain: 'studio-image-e9a1b.firebaseapp.com',
  projectId: 'studio-image-e9a1b',
  storageBucket: 'studio-image-e9a1b.firebasestorage.app',
  messagingSenderId: '536422944308',
  appId: '1:536422944308:web:514aa1e9d947a23d2a4461',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export function subscribeAuth(callback: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    callback(toAuthUser(user));
  });
}

export async function signInWithGoogle(): Promise<AuthUser> {
  const result = await signInWithPopup(auth, googleProvider);
  const mapped = toAuthUser(result.user);
  if (!mapped) {
    throw new Error('Không lấy được thông tin tài khoản Google.');
  }
  return mapped;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function getFirebaseIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}
