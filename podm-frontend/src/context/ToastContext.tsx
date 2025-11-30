import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { registerErrorHandler } from '../lib/apiClient';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    addToast: (type: ToastType, message: string, duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, type, message, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    // Register the error handler with the API client
    useEffect(() => {
        registerErrorHandler((message: string, type: 'success' | 'error' | 'info') => {
            // Map 'info' to 'info' and 'error' to 'error', 'success' to 'success'
            // ToastType has 'warning' as well, but apiClient only sends success/error/info
            addToast(type as ToastType, message);
        });
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-400" />,
        error: <AlertCircle className="w-5 h-5 text-red-400" />,
        warning: <AlertCircle className="w-5 h-5 text-yellow-400" />,
        info: <Info className="w-5 h-5 text-blue-400" />,
    };

    const bgColors = {
        success: 'bg-gray-800 border-green-500/50',
        error: 'bg-gray-800 border-red-500/50',
        warning: 'bg-gray-800 border-yellow-500/50',
        info: 'bg-gray-800 border-blue-500/50',
    };

    return (
        <div className={`flex items-center w-full max-w-xs p-4 mb-2 text-gray-200 border rounded-lg shadow-lg ${bgColors[toast.type]} animate-slide-in`}>
            <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8">
                {icons[toast.type]}
            </div>
            <div className="ml-3 text-sm font-normal">{toast.message}</div>
            <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 bg-transparent text-gray-400 hover:text-gray-100 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 inline-flex h-8 w-8"
                onClick={() => onRemove(toast.id)}
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
