import React, { useEffect } from 'react';
import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
    id: string;
    type: ToastType;
    title?: string;
    message: string;
    duration?: number;
}

interface ToastProps {
    toast: ToastMessage;
    onClose: (id: string) => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(({ toast, onClose }, ref) => {
    useEffect(() => {
        if (toast.duration !== Infinity) {
            const timer = setTimeout(() => {
                onClose(toast.id);
            }, toast.duration || 5000);
            return () => clearTimeout(timer);
        }
    }, [toast, onClose]);

    const icons = {
        success: 'ph:check-circle-fill',
        error: 'ph:x-circle-fill',
        info: 'ph:info-fill',
        warning: 'ph:warning-circle-fill'
    };

    const colors = {
        success: 'text-green-500 bg-green-50 border-green-100',
        error: 'text-red-500 bg-red-50 border-red-100',
        info: 'text-blue-500 bg-blue-50 border-blue-100',
        warning: 'text-orange-500 bg-orange-50 border-orange-100'
    };

    return (
        <motion.div
            ref={ref}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`relative flex items-start gap-3 p-4 rounded-xl border shadow-lg bg-white min-w-[300px] max-w-sm pointer-events-auto`}
        >
            <Icon icon={icons[toast.type]} className={`w-6 h-6 flex-shrink-0 ${colors[toast.type].split(' ')[0]}`} />

            <div className="flex-1 mr-2">
                {toast.title && <h4 className="font-bold text-gray-900 text-sm">{toast.title}</h4>}
                <p className="text-sm text-gray-600 leading-relaxed">{toast.message}</p>
            </div>

            <button
                onClick={() => onClose(toast.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
            >
                <Icon icon="ph:x" width="20" height="20" />
            </button>
        </motion.div>
    );
});

Toast.displayName = 'Toast';

export default Toast;
