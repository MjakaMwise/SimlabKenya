import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  original_filename: string;
  bytes: number;
  format: string;
}

const configureCloudinary = () => {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error('Missing Cloudinary configuration: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET are required');
  }

  cloudinary.config({ cloud_name, api_key, api_secret });
};

const bufferToStream = (buffer: Buffer): Readable => {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
};

export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  originalName: string,
  folder = 'simlab-abstracts'
): Promise<CloudinaryUploadResult> => {
  configureCloudinary();

  const publicId = `${Date.now()}-${originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto', public_id: publicId },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary upload failed'));
        } else {
          resolve(result as CloudinaryUploadResult);
        }
      }
    );
    bufferToStream(fileBuffer).pipe(uploadStream);
  });
};
