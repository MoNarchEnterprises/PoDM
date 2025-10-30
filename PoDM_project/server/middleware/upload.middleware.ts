import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { AppError } from './error.middleware';

// --- Multer Configuration ---
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Invalid file type. Only images and videos are allowed.', 400));
    }
};

const multerInstance = multer({
    storage: storage,
    limits: {
        // --- THIS IS THE PRIMARY FIX ---
        // Increased the file size limit from 100MB to 1GB to accommodate large videos.
        fileSize: 1024 * 1024 * 1024, // 1 GB limit
    },
    fileFilter: fileFilter,
});

/**
 * A wrapper function that creates a proper Express middleware for handling multer uploads.
 * It catches multer-specific errors and transforms them into our standard AppError.
 * This is the standard pattern for handling Multer errors gracefully.
 * @param uploadHandler - The actual multer upload function (e.g., multer().array(), multer().single()).
 */
const createUploadMiddleware = (uploadHandler: (req: Request, res: Response, callback: (err?: any) => void) => void) => {
    return (req: Request, res: Response, next: NextFunction) => {
        uploadHandler(req, res, (err) => {
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
            // If no error, proceed to the controller.
            next();
        });
    };
};

/**
 * Middleware for handling content uploads.
 * Processes up to 10 files from a field named 'contentFiles'.
 */
export const uploadContent = createUploadMiddleware(multerInstance.array('contentFiles', 10));

/**
 * Middleware for handling a single avatar file upload.
 * Processes one file from a field named 'avatar'.
 */
export const uploadAvatar = createUploadMiddleware(multerInstance.single('avatar'));

/**
 * Middleware for handling creator verification document uploads.
 * Processes one file from 'idFile' and one from 'selfieFile'.
 */
export const uploadVerificationDocs = createUploadMiddleware(multerInstance.fields([
    { name: 'idFile', maxCount: 1 },
    { name: 'selfieFile', maxCount: 1 },
]));

/**
 * Middleware for handling a single banner file upload.
 * Processes one file from a field named 'banner'.
 */
export const uploadBanner = createUploadMiddleware(multerInstance.single('banner'));