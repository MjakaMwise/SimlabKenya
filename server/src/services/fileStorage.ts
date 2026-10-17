import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

// Uploads live on the VPS: a Docker volume in production, ./uploads when running locally.
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');

export type UploadFolder = 'abstracts' | 'shop';

export const folderPath = (folder: UploadFolder): string => path.join(UPLOAD_DIR, folder);

// The stored name is random and keeps only a safe extension, so a client-supplied file name never reaches the disk.
export const saveUpload = async (folder: UploadFolder, buffer: Buffer, originalName: string): Promise<string> => {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 8);
  const storedName = `${randomUUID()}${ext}`;
  await mkdir(folderPath(folder), { recursive: true });
  await writeFile(path.join(folderPath(folder), storedName), buffer);
  return storedName;
};

// Absolute path of a stored file, or null if the name could point outside the folder.
export const resolveUpload = (folder: UploadFolder, storedName: string): string | null => {
  if (!/^[0-9a-f-]{36}(\.[a-z0-9]{1,7})?$/.test(storedName)) return null;
  return path.join(folderPath(folder), storedName);
};
