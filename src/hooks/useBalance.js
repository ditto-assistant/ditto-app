import { useState, useEffect, useContext, createContext } from "react";
import { getBalance } from "../api/getBalance";
import { useAuth } from "./useAuth";
import { FetchHook } from "../types/common";
import { Balance } from "../types/api";

// TODO: Make this server-side
export const PREMIUM_BALANCE_THRESHOLD = 3_000_000_000;

/**
 * Access the user's balance context.
 * @returns {FetchHook<Balance & {hasPremium: boolean}>}
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
  const { ok, err, loading, refetch } = useBal();
  return (
    <BalanceContext.Provider
      value={{
        ok,
        loading,
        err,
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
  const [err, setErr] = useState(null);
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
          if (result.ok.balanceRaw >= PREMIUM_BALANCE_THRESHOLD) {
            setOk({ ...result.ok, hasPremium: true });
          } else {
            setOk(result.ok);
          }
        } else {
          setErr(result.err);
        }
      } catch (err) {
        setErr(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchBalance().then(() => setRefetch(false));
  }, [refetch, user]);

  return { ok, err, loading, refetch: () => setRefetch(true) };
}
