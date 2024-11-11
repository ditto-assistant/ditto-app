import { useState, useEffect, useContext, createContext } from "react";
import { getBalance } from "../api/get-balance";
import { useAuth } from "./useAuth";
/**
 * Access the user's balance context.
 *
 * @returns {{
 *   balance: string,
 *   usd: string,
 *   images: string,
 *   searches: string,
 *   loading: boolean,
 *   error: string,
 *   refetch: (() => void)
 * }} The balance object containing the user's balance and available images,
 *    and a function to refetch the balance.
 * @throws {Error} Throws an error if used outside of a BalanceProvider.
 */
export function useBalance() {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error("useBalance must be used within a BalanceProvider");
  }
  return context;
}

const BalanceContext = createContext();

export function BalanceProvider({ children }) {
  const { ok, error, loading, refetch } = useBal();
  return (
    <BalanceContext.Provider
      value={{
        balance: ok?.balance,
        usd: ok?.usd,
        images: ok?.images,
        searches: ok?.searches,
        loading,
        error,
        refetch,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
}

/**
 * Custom hook to fetch and manage the user's balance.
 *
 * @returns {{ok?: {balance: string, usd: string, images: string, searches: string}, error?: string, loading?: boolean, refetch: (() => void)}} An object containing the balance, any error that occurred, a loading state, and a function to refetch the balance.
 */
function useBal() {
  const { user } = useAuth();
  const [ok, setOk] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refetch, setRefetch] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
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
  }, [refetch, user]);

  return { ok, error, loading, refetch: () => setRefetch(true) };
}
