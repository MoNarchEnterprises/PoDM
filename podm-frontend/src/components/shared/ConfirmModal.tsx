import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    isLoading = false,
}) => {
    const variantStyles = {
        danger: { iconColor: 'text-red-500', bgColor: 'bg-red-600 hover:bg-red-700' },
        warning: { iconColor: 'text-yellow-500', bgColor: 'bg-yellow-600 hover:bg-yellow-700' },
        info: { iconColor: 'text-blue-500', bgColor: 'bg-blue-600 hover:bg-blue-700' },
    };

    const styles = variantStyles[variant];

    const handleConfirm = async () => {
        await onConfirm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-6">
                <div className="flex items-start space-x-4">
                    <div className={'flex-shrink-0 ' + styles.iconColor}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3 rounded-b-2xl">
                <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                    {cancelLabel}
                </Button>
                <Button
                    onClick={handleConfirm}
                    isLoading={isLoading}
                    className={'text-white ' + styles.bgColor}
                >
                    {confirmLabel}
                </Button>
            </div>
        </Modal>
    );
};

export default ConfirmModal;
