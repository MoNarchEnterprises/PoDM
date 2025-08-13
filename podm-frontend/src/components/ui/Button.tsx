import React from 'react';
import { LucideIcon } from 'lucide-react';

// --- Helper for managing component variants ---
// In a real project, you might use a library like 'class-variance-authority'.
// For simplicity, we'll use a helper function here.
const getButtonClasses = (
    variant: ButtonProps['variant'], 
    size: ButtonProps['size']
) => {
    const baseClasses = "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses = {
        primary: "bg-purple-600 text-white hover:bg-purple-700",
        secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600",
        danger: "bg-red-600 text-white hover:bg-red-700",
        ghost: "bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
    };

    const sizeClasses = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
    };

    return `${baseClasses} ${variantClasses[variant!]} ${sizeClasses[size!]}`;
};

// --- Loader Spinner Component ---
const Loader = ({ size }: { size: ButtonProps['size'] }) => {
    const sizeClasses = {
        sm: "w-4 h-4",
        md: "w-5 h-5",
        lg: "w-6 h-6",
    };
    return (
        <svg className={`animate-spin ${sizeClasses[size!]} text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    );
};


// --- Main Button Component ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /**
     * The visual style of the button.
     */
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    /**
     * The size of the button.
     */
    size?: 'sm' | 'md' | 'lg';
    /**
     * If true, the button will be in a loading state.
     */
    isLoading?: boolean;
    /**
     * Optional icon to display before the button text.
     */
    leftIcon?: LucideIcon;
    /**
     * Optional icon to display after the button text.
     */
    rightIcon?: LucideIcon;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ 
        children, 
        className = '', 
        variant = 'primary', 
        size = 'md', 
        isLoading = false, 
        disabled,
        leftIcon: LeftIcon,
        rightIcon: RightIcon,
        ...props 
    }, ref) => {
        
        const computedClasses = getButtonClasses(variant, size);

        return (
            <button
                ref={ref}
                className={`${computedClasses} ${className}`}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Loader size={size} />}
                {!isLoading && LeftIcon && <LeftIcon className="w-4 h-4 mr-2" />}
                {!isLoading && children}
                {!isLoading && RightIcon && <RightIcon className="w-4 h-4 ml-2" />}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
