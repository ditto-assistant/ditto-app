import { useContext, createContext } from "react"
import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { getBalance, Balance } from "@/api/getBalance"
import { useAuth } from "@/hooks/useAuth"
import { useRewardNotification } from "@/hooks/useRewardNotification"

export function useBalance() {
  const context = useContext(BalanceContext)
  if (context === undefined) {
    throw new Error("useBalance must be used within a BalanceProvider")
  }
  return context
}

const BalanceContext = createContext<
  UseQueryResult<Balance, Error> | undefined
>(undefined)

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { showReward, RewardNotificationComponent } = useRewardNotification()

  const balanceQuery = useQuery({
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
      // Only show notification for recent airdrops (within last 5 seconds)
      const now = new Date()
      const timeSinceAirdrop = now.getTime() - res.lastAirdropAt.getTime()
      if (timeSinceAirdrop > 5000) {
        console.log(
          "Skipping airdrop notification - too old:",
          timeSinceAirdrop,
          "ms"
        )
        return res
      }

      const dropAmount = res.dropAmount
      showReward(`${res.planTierName} reward +${dropAmount}`)

      return res
    },
    enabled: !!user,
  })

  return (
    <BalanceContext.Provider value={balanceQuery}>
      {children}
      <RewardNotificationComponent />
    </BalanceContext.Provider>
  )
}
