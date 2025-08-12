import React from 'react';
import { LucideIcon } from 'lucide-react';

// --- Main Input Component ---
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /**
     * A unique identifier for the input field.
     */
    id: string;
    /**
     * The label text to display above the input field.
     */
    label?: string;
    /**
     * Optional icon to display inside the input field on the left.
     */
    leftIcon?: LucideIcon;
    /**
     * An error message to display below the input field.
     */
    error?: string;
    /**
     * Additional CSS classes to apply to the container div.
     */
    containerClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ 
        id,
        label,
        leftIcon: LeftIcon,
        error,
        className = '',
        containerClassName = '',
        ...props 
    }, ref) => {
        
        const hasIcon = !!LeftIcon;
        const hasError = !!error;

        const inputPaddingClass = hasIcon ? 'pl-10' : 'pl-4';

        return (
            <div className={`w-full ${containerClassName}`}>
                {label && (
                    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {LeftIcon && (
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <LeftIcon className="h-5 w-5 text-gray-400" />
                        </div>
                    )}
                    <input
                        id={id}
                        ref={ref}
                        className={`w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md py-2 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${inputPaddingClass} ${hasError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-purple-500'} ${className}`}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="mt-1 text-xs text-red-500">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
