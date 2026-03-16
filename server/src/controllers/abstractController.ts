import { Request, Response } from 'express';
import { z } from 'zod';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import {
  saveAbstractToFirestore,
  getAbstractsFromFirestore,
  getAbstractFromFirestore,
  updateAbstractStatusInFirestore,
} from '../services/firebaseService.js';
import { sendAbstractEmails, sendAbstractStatusEmail } from '../services/emailService.js';
import { AbstractSubmission, UploadedAbstractFile } from '../types/index.js';

const abstractBodySchema = z.object({
  schoolName: z.string().min(1, 'School name is required'),
  // multipart sends a single string when one value, array when multiple
  studentNames: z.preprocess(
    (val) => (Array.isArray(val) ? val : [val]),
    z.array(z.string().min(1, 'Student name cannot be empty')).min(1, 'At least one student name is required')
  ),
  teacherName: z.string().min(1, 'Teacher name is required'),
  teacherEmail: z.string().email('Valid teacher email is required'),
  teacherContact: z.string().min(1, 'Teacher contact is required'),
  projectTitle: z.string().min(1, 'Project title is required'),
  projectDescription: z.string().min(10, 'Project description is required (min 10 characters)'),
  projectCategory: z.string().min(1, 'Project category is required'),
});

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  'text/plain',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file

// POST /api/abstracts — public
export const submitAbstract = async (req: Request, res: Response) => {
  // Validate text body fields
  const parsed = abstractBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  // Validate uploaded files
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'At least one file is required' });
  }

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.status(400).json({
        error: `Invalid file type for "${file.originalname}". Allowed: PDF, DOC, DOCX, XLS, XLSX, ODT, TXT`,
      });
    }
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: `File "${file.originalname}" exceeds the 5MB size limit`,
      });
    }
  }

  // Upload all files to Cloudinary
  const submission = parsed.data as AbstractSubmission;

  let uploadedFiles: UploadedAbstractFile[];
  try {
    uploadedFiles = await Promise.all(
      files.map(async (file): Promise<UploadedAbstractFile> => {
        const result = await uploadToCloudinary(file.buffer, file.originalname);
        return {
          originalName: file.originalname,
          cloudinaryUrl: result.secure_url,
          cloudinaryPublicId: result.public_id,
          mimeType: file.mimetype,
          size: file.size,
        };
      })
    );
  } catch (err) {
    console.error('[Abstract] Cloudinary upload error:', err);
    return res.status(500).json({ error: 'Failed to upload files. Please try again.' });
  }

  // Save to Firebase Firestore
  let docRef;
  try {
    docRef = await saveAbstractToFirestore(submission, uploadedFiles);
  } catch (err) {
    console.error('[Abstract] Firestore save error:', err);
    return res.status(500).json({ error: 'Failed to save submission. Please try again.' });
  }

  // Send email notifications in background
  const primaryFile = uploadedFiles[0];
  sendAbstractEmails({
    ...submission,
    fileName: primaryFile.originalName,
    viewUrl: primaryFile.cloudinaryUrl,
  }).catch((err) => console.error('[Abstract emails] Failed to send:', err.message));


  res.status(201).json({
    success: true,
    submissionId: docRef.id,
    message: 'Abstract submitted successfully. You will receive a confirmation email shortly.',
    filesUploaded: uploadedFiles.length,
  });
};

// GET /api/abstracts — admin only
export const listAbstracts = async (_req: Request, res: Response) => {
  try {
    const abstracts = await getAbstractsFromFirestore();
    res.json(abstracts);
  } catch (err) {
    console.error('[Abstracts] List error:', err);
    res.status(500).json({ error: 'Failed to fetch abstracts' });
  }
};

// GET /api/abstracts/:id — admin only
export const getAbstract = async (req: Request, res: Response) => {
  try {
    const abstract = await getAbstractFromFirestore(req.params.id);
    if (!abstract) return res.status(404).json({ error: 'Abstract not found' });
    res.json(abstract);
  } catch (err) {
    console.error('[Abstracts] Get error:', err);
    res.status(500).json({ error: 'Failed to fetch abstract' });
  }
};

// PATCH /api/abstracts/:id/status — admin only
export const updateAbstractStatus = async (req: Request, res: Response) => {
  const { status } = req.body;
  const allowed = ['pending', 'reviewed', 'accepted', 'rejected'];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  }
  try {
    const [abstract] = await Promise.all([
      getAbstractFromFirestore(req.params.id),
      updateAbstractStatusInFirestore(req.params.id, status),
    ]);

    if (abstract) {
      const a = abstract as Record<string, unknown>;
      const studentNames: string[] = Array.isArray(a.studentNames)
        ? (a.studentNames as string[])
        : [String(a.studentName ?? a.studentNames ?? '')];
      sendAbstractStatusEmail({
        teacherName: String(a.teacherName ?? ''),
        teacherEmail: String(a.teacherEmail ?? ''),
        studentNames,
        schoolName: String(a.schoolName ?? ''),
        projectTitle: String(a.projectTitle ?? ''),
        projectCategory: String(a.projectCategory ?? ''),
        status,
      }).catch((err) => console.error('[Abstract status email] Failed:', err.message));
    }

    res.json({ success: true, status });
  } catch (err) {
    console.error('[Abstracts] Status update error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
};
