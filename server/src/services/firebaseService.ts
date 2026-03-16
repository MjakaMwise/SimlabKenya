import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { AbstractSubmission, UploadedAbstractFile } from '../types/index.js';

let adminApp: App;

const getAdminApp = (): App => {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId) {
    throw new Error('Missing FIREBASE_PROJECT_ID environment variable');
  }

  // If service account credentials are available, use them (full Admin SDK access)
  if (clientEmail && privateKey) {
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    // Fallback: use Application Default Credentials or just project ID
    adminApp = initializeApp({ projectId });
  }

  return adminApp;
};

const db = () => getFirestore(getAdminApp());

export interface AbstractDocument {
  id: string;
  submittedAt: string;
}

export const saveAbstractToFirestore = async (
  submission: AbstractSubmission,
  files: UploadedAbstractFile[]
): Promise<AbstractDocument> => {
  const docData = {
    schoolName: submission.schoolName,
    studentNames: submission.studentNames,
    teacherName: submission.teacherName,
    teacherEmail: submission.teacherEmail,
    teacherContact: submission.teacherContact,
    projectTitle: submission.projectTitle,
    projectDescription: submission.projectDescription,
    projectCategory: submission.projectCategory,
    files: files.map((f) => ({
      originalName: f.originalName,
      url: f.cloudinaryUrl,
      publicId: f.cloudinaryPublicId,
      mimeType: f.mimeType,
      size: f.size,
    })),
    submittedAt: FieldValue.serverTimestamp(),
    status: 'pending',
  };

  const docRef = await db().collection('abstracts').add(docData);

  return {
    id: docRef.id,
    submittedAt: new Date().toISOString(),
  };
};

export const getAbstractsFromFirestore = async () => {
  const snapshot = await db()
    .collection('abstracts')
    .orderBy('submittedAt', 'desc')
    .get();

  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      submittedAt: data.submittedAt?.toDate?.()?.toISOString() ?? null,
    };
  });
};

export const getAbstractFromFirestore = async (id: string) => {
  const docSnap = await db().collection('abstracts').doc(id).get();
  if (!docSnap.exists) return null;
  const data = docSnap.data()!;
  return {
    id: docSnap.id,
    ...data,
    submittedAt: data.submittedAt?.toDate?.()?.toISOString() ?? null,
  };
};

export const updateAbstractStatusInFirestore = async (id: string, status: string) => {
  await db().collection('abstracts').doc(id).update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  });
};
