import { useContext, createContext } from "react"
import { useQuery } from "@tanstack/react-query"
import { getBalance } from "@/api/getBalance"
import { useAuth } from "@/hooks/useAuth"
import toast from "react-hot-toast"
import BalanceDropToast from "@/components/toasts/BalanceDropToast"

// TODO: Make this server-side
export const PREMIUM_BALANCE_THRESHOLD = 1_000_000_000

export function useBalance() {
  const context = useContext(BalanceContext)
  if (context === undefined) {
    throw new Error("useBalance must be used within a BalanceProvider")
  }
  return context
}

const BalanceContext = createContext<ReturnType<typeof useBal> | undefined>(
  undefined
)

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const value = useBal()
  return (
    <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>
  )
}

function useBal() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["balance", user?.uid],
    queryFn: async () => {
      const result = await getBalance()
      if (result.err) {
        throw new Error(result.err)
      }
      if (!result.ok) {
        throw new Error("Unable to get balance")
      }
      if (!result.ok.dropAmount) {
        return result.ok
      }
      if (!result.ok.lastAirdropAt) {
        return result.ok
      }
      // Only show toast for recent airdrops (within last 5 seconds)
      const now = new Date()
      const timeSinceAirdrop = now.getTime() - result.ok.lastAirdropAt.getTime()
      if (timeSinceAirdrop > 5000) {
        console.log("Skipping airdrop toast - too old:", timeSinceAirdrop, "ms")
        return result.ok
      }

      const dropAmount = result.ok.dropAmount
      // Using consistent ID ensures only one toast is shown at a time
      toast.custom((t) => <BalanceDropToast t={t} amount={dropAmount} />, {
        // duration: 2000,
        id: "balance-drop-toast" // Using a consistent ID prevents duplicates
      })

      return result.ok
    },
    enabled: !!user
  })
}
