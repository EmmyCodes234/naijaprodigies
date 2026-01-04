import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
            gcTime: 1000 * 60 * 30, // Unused data is garbage collected after 30 minutes
            retry: 1,
            refetchOnWindowFocus: true, // Refetch when window gains focus (good for social apps)
        },
    },
});

export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};
