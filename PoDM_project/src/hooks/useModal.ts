import { useState, useCallback } from 'react';

/**
 * A custom hook to manage the open/close state of a modal.
 * @returns An object containing the modal's state and functions to control it.
 */
export const useModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    /**
     * A memoized function to open the modal.
     */
    const openModal = useCallback(() => {
        setIsOpen(true);
    }, []);

    /**
     * A memoized function to close the modal.
     */
    const closeModal = useCallback(() => {
        setIsOpen(false);
    }, []);

    return {
        isOpen,
        openModal,
        closeModal,
    };
};
