import { useState, useEffect, useContext, createContext } from 'react';
import { grabConversationHistoryCount } from '../control/firebase';
import { useAuth } from './useAuth';

const MemoryCountContext = createContext();

export function useMemoryCount() {
    const context = useContext(MemoryCountContext);
    if (context === undefined) {
        throw new Error('useMemoryCount must be used within a MemoryCountProvider');
    }
    return context;
}

export function MemoryCountProvider({ children }) {
    const { count, loading, error, refetch } = useMemCount();
    return (
        <MemoryCountContext.Provider value={{
            count,
            loading,
            error,
            refetch
        }}>
            {children}
        </MemoryCountContext.Provider>
    );
}

function useMemCount() {
    const { user } = useAuth();
    const [count, setCount] = useState(0);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refetch, setRefetch] = useState(false);

    useEffect(() => {
        if (!user) {
            return;
        }

        async function fetchCount() {
            try {
                const userID = localStorage.getItem('userID');
                if (userID) {
                    const memoryCount = await grabConversationHistoryCount(userID);
                    setCount(memoryCount);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchCount().then(() => setRefetch(false));

        // Listen for memory-related events
        const handleMemoryUpdate = () => setRefetch(true);
        window.addEventListener('memoryUpdated', handleMemoryUpdate);
        window.addEventListener('memoryDeleted', handleMemoryUpdate);
        
        return () => {
            window.removeEventListener('memoryUpdated', handleMemoryUpdate);
            window.removeEventListener('memoryDeleted', handleMemoryUpdate);
        };
    }, [refetch, user]);

    return { count, error, loading, refetch: () => setRefetch(true) };
} 