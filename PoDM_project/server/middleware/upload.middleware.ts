import { NextFunction, Request } from 'express';
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
        fileSize: 1024 * 1024 * 1024, // 100 MB limit
    },
    fileFilter: fileFilter,
});

/**
 * A dedicated error handling middleware for Multer.
 * This runs after the upload and catches specific upload errors,
 * like the file being too large, and formats them nicely for the frontend.
 */
export const handleUploadErrors = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading.
        if (err.code === 'LIMIT_FILE_SIZE') {
            // Pass a user-friendly AppError to our global error handler.
            return next(new AppError('File is too large. The maximum size is 1GB.', 400));
        }
        // Handle other potential Multer errors here if needed.
        return next(new AppError(`File upload error: ${err.message}`, 400));
    } else if (err) {
        // An unknown error occurred when uploading.
        return next(err);
    }

    // If no error, proceed to the next middleware (the controller).
    next();
};

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

/**
 * Middleware for handling a single banner file upload.
 * This will process one file from a field named 'banner'.
 * The file will be available on `req.file`.
 */
export const uploadBanner = upload.single('banner');