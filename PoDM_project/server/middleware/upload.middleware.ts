import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { AppError } from './error.middleware';

// --- Multer Configuration ---

/**
 * Configure where to store the files temporarily.
 * Using memoryStorage is efficient for processing files before uploading
 * them to a cloud service like Supabase Storage.
 */
const storage = multer.memoryStorage();

/**
 * A filter to ensure that only allowed file types are uploaded.
 * This provides a basic layer of security and validation.
 */
const fileFilter = (
    req: Request, 
    file: Express.Multer.File, 
    cb: FileFilterCallback
) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true); // Accept the file
    } else {
        cb(new AppError('Invalid file type. Only images and videos are allowed.', 400));
    }
};

/**
 * The configured Multer instance.
 * - We use memoryStorage to hold the file buffer.
 * - We set a file size limit (e.g., 100MB) to prevent abuse.
 * - We apply our custom file filter.
 */
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB limit
    },
    fileFilter: fileFilter,
});

/**
 * Middleware for handling content uploads.
 * This will process up to 10 files from a field named 'contentFiles'.
 * The files will be available on `req.files`.
 */
export const uploadContent = upload.array('contentFiles', 10);

/**
 * Middleware for handling a single avatar file upload.
 * This will process one file from a field named 'avatar'.
 * The file will be available on `req.file`.
 */
export const uploadAvatar = upload.single('avatar');

/**
 * Middleware for handling creator verification document uploads.
 * This will process one file from 'idFile' and one from 'selfieFile'.
 * The files will be available on `req.files`.
 */
export const uploadVerificationDocs = upload.fields([
    { name: 'idFile', maxCount: 1 },
    { name: 'selfieFile', maxCount: 1 },
]);