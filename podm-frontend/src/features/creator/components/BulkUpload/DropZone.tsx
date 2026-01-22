import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';

interface DropZoneProps {
    onFilesDropped: (files: File[]) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ onFilesDropped }) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            onFilesDropped(acceptedFiles);
        }
    }, [onFilesDropped]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
            'video/*': ['.mp4', '.mov'] // Optional: enable video later
        }
    });

    return (
        <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors
                ${isDragActive ? 'border-brand-500 bg-brand-500/10' : 'border-gray-700 hover:border-brand-400 hover:bg-gray-800/50'}
            `}
        >
            <input {...getInputProps()} />
            <div className="bg-gray-800 p-4 rounded-full mb-4">
                <UploadCloud className={`w-8 h-8 ${isDragActive ? 'text-brand-400' : 'text-gray-400'}`} />
            </div>
            {isDragActive ? (
                <p className="text-xl font-medium text-brand-400">Drop your files here!</p>
            ) : (
                <div className="text-center">
                    <p className="text-lg font-medium text-white mb-1">Drag & drop your files here</p>
                    <p className="text-sm text-gray-400">or click to select from your computer</p>
                    <p className="text-xs text-gray-500 mt-4">Supports JPG, PNG, WEBP</p>
                </div>
            )}
        </div>
    );
};

export default DropZone;
