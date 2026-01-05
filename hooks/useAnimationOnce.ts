import { useEffect, useRef } from 'react';

/**
 * Hook to track if animations have already played for a component
 * Prevents re-animating on page revisits for better UX
 */
export const useAnimationOnce = (componentId: string) => {
    const hasAnimated = useRef(false);

    useEffect(() => {
        // Check if this component has animated before in this session
        const key = `animated_${componentId}`;
        const wasAnimated = sessionStorage.getItem(key);

        if (wasAnimated) {
            hasAnimated.current = true;
        }

        return () => {
            // Mark as animated when component unmounts
            if (!hasAnimated.current) {
                sessionStorage.setItem(key, 'true');
                hasAnimated.current = true;
            }
        };
    }, [componentId]);

    return hasAnimated.current;
};
