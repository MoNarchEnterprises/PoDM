import { useEffect, RefObject } from 'react';

// Define a generic type for the event to handle both mouse and touch
type AnyEvent = MouseEvent | TouchEvent;

/**
 * A custom hook that triggers a callback when a click or touch event occurs outside of the referenced element.
 * @param ref - A React ref object attached to the element to monitor for outside clicks.
 * @param handler - The function to call when an outside click is detected.
 */
export const useOnClickOutside = <T extends HTMLElement>(
    ref: RefObject<T | null>,
    handler: (event: AnyEvent) => void
) => {
    useEffect(() => {
        const listener = (event: AnyEvent) => {
            const el = ref.current;
            // Do nothing if clicking ref's element or its descendants
            if (!el || el.contains(event.target as Node)) {
                return;
            }
            handler(event);
        };

        // Add event listeners for both mouse and touch events
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        // Cleanup function to remove the event listeners when the component unmounts
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
};
