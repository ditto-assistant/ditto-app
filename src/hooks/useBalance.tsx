import { useContext, createContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBalance } from "@/api/getBalance";
import { useAuth } from "@/hooks/useAuth";

// TODO: Make this server-side
export const PREMIUM_BALANCE_THRESHOLD = 1_000_000_000;

export function useBalance() {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error("useBalance must be used within a BalanceProvider");
  }
  return context;
}

const BalanceContext = createContext<ReturnType<typeof useBal> | undefined>(
  undefined
);

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const value = useBal();
  return (
    <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>
  );
}

function useBal() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["balance", user?.uid],
    queryFn: async () => {
      const result = await getBalance();
      if (result.ok) {
        return {
          ...result.ok,
          hasPremium: result.ok.balanceRaw >= PREMIUM_BALANCE_THRESHOLD,
        };
      }
      throw new Error(result.err);
    },
    enabled: !!user,
  });
}
