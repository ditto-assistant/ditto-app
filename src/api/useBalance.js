import { useState, useEffect } from 'react';
import { getBalance } from './get-balance';

/**
 * Custom hook to fetch and manage the user's balance.
 * 
 * @returns {{ok?: {balance: string, images: string}, error?: string, loading?: boolean, refetch: (() => void)}} An object containing the balance, any error that occurred, a loading state, and a function to refetch the balance.
 */
export function useBalance() {
    const [ok, setOk] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refetch, setRefetch] = useState(false);

    useEffect(() => {
        /**
         * Asynchronous function to fetch the user's balance.
         */
        async function fetchBalance() {
            try {
                const result = await getBalance();
                if (result.ok) {
                    setOk(result.ok);
                } else {
                    setError(result.err);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchBalance().then(() => setRefetch(false));
    }, [refetch]);

    return { ok, error, loading, refetch: () => setRefetch(true) };
}
