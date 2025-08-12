import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// --- Main Modal Component ---
export interface ModalProps {
    /**
     * Controls whether the modal is visible or not.
     */
    isOpen: boolean;
    /**
     * A function to be called when the modal is requested to be closed (e.g., by clicking the backdrop or the close button).
     */
    onClose: () => void;
    /**
     * The content to be rendered inside the modal.
     */
    children: React.ReactNode;
    /**
     * Optional additional CSS classes to apply to the modal's content container.
     */
    className?: string;
    /**
     * If true, hides the default close button in the top corner.
     */
    hideCloseButton?: boolean;
}

const Modal = ({ isOpen, onClose, children, className = '', hideCloseButton = false }: ModalProps) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Effect to handle closing the modal when the Escape key is pressed
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    // Effect to handle closing the modal when clicking outside of it
    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (modalRef.current && event.target === modalRef.current) {
            onClose();
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div
            ref={modalRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
        >
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col relative ${className}`}>
                {!hideCloseButton && (
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 z-10"
                        aria-label="Close modal"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                )}
                {children}
            </div>
        </div>
    );
};

export default Modal;
