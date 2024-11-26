import { useState, useEffect, useContext, createContext } from "react";
import { getBalance } from "@/api/getBalance";
import { useAuth } from "@/hooks/useAuth";
import { FetchHook } from "@/types/common";
import { Balance } from "@/types/api";

// TODO: Make this server-side
export const PREMIUM_BALANCE_THRESHOLD = 1_000_000_000;

type BalanceWithPremium = Balance & { hasPremium: boolean };
type BalanceHook = FetchHook<BalanceWithPremium>;

export function useBalance(): BalanceHook {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error("useBalance must be used within a BalanceProvider");
  }
  return context;
}

const BalanceContext = createContext<BalanceHook | undefined>(undefined);

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const value = useBal();
  return (
    <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>
  );
}

function useBal(): BalanceHook {
  const { user } = useAuth();
  const [ok, setOk] = useState<BalanceWithPremium | undefined>(undefined);
  const [err, setErr] = useState<string | undefined>(undefined);
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
            setOk({ ...result.ok, hasPremium: false });
          }
        } else {
          setErr(result.err);
        }
      } catch (err) {
        setErr(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchBalance().then(() => setRefetch(false));
  }, [refetch, user]);

  return { ok, err, loading, refetch: () => setRefetch(true) };
}
