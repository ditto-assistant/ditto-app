import { useContext, createContext } from "react"
import { useQuery } from "@tanstack/react-query"
import { getBalance } from "@/api/getBalance"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"

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
      const res = result.ok
      if (!res.dropAmount || !res.lastAirdropAt) {
        return res
      }
      // Only show toast for recent airdrops (within last 5 seconds)
      const now = new Date()
      const timeSinceAirdrop = now.getTime() - res.lastAirdropAt.getTime()
      if (timeSinceAirdrop > 5000) {
        console.log("Skipping airdrop toast - too old:", timeSinceAirdrop, "ms")
        return res
      }

      const dropAmount = res.dropAmount
      toast.success(`${res.planTierName} reward +${dropAmount}`, {
        id: "balance-drop-toast",
        icon: "💰",
        duration: 2000,
        className: "animate-bounce",
      })

      return res
    },
    enabled: !!user,
  })
}
