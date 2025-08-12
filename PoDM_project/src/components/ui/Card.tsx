import React from 'react';

interface CardProps {
    /**
     * The content to be rendered inside the card.
     */
    children: React.ReactNode;
    /**
     * Optional additional CSS classes to apply to the card container.
     */
    className?: string;
    /**
     * If true, removes the default padding from the card.
     */
    noPadding?: boolean;
}

/**
 * A versatile and reusable card component that provides a consistent container style.
 */
const Card = ({ children, className = '', noPadding = false }: CardProps) => {
    const paddingClass = noPadding ? '' : 'p-4 sm:p-6';

    return (
        <div 
            className={`bg-white dark:bg-gray-800/50 rounded-xl shadow-md backdrop-blur-sm border border-gray-200 dark:border-gray-700 ${paddingClass} ${className}`}
        >
            {children}
        </div>
    );
};

export default Card;
