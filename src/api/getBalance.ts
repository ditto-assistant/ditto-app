import { getToken } from "@/api/auth"
import { routes } from "@/firebaseConfig"
import { Result } from "@/types/common"
import { getDeviceID, APP_VERSION } from "@/utils/deviceId"
import { z } from "zod"

const BalanceSchema = z.object({
  balanceRaw: z.number(),
  balance: z.string(),
  usd: z.string(),
  images: z.string(),
  imagesRaw: z.number(),
  searches: z.string(),
  searchesRaw: z.number(),
  dropAmountRaw: z.number().optional(),
  dropAmount: z.string().optional(),
  totalAirdroppedRaw: z.number().optional(),
  totalAirdropped: z.string().optional(),
  lastAirdropAt: z.coerce.date().optional(),
  planTier: z.number(),
  planTierName: z.string(),
})

export type Balance = z.infer<typeof BalanceSchema>

// Retrieves the user's balance.
export async function getBalance(): Promise<Result<Balance>> {
  const tok = await getToken()
  if (tok.err) {
    console.error(tok.err)
    return { err: `getBalance: Unable to get auth token: ${tok.err}` }
  }
  if (!tok.ok) {
    return { err: "getBalance: No token" }
  }

  const deviceID = getDeviceID()
  try {
    const response = await fetch(
      routes.balance(tok.ok.userID, tok.ok.email, APP_VERSION, deviceID),
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tok.ok?.token}`,
          Accept: "application/json",
        },
      }
    )

    if (response.ok) {
      const rawData: unknown = await response.json()
      const result = BalanceSchema.safeParse(rawData)

      if (result.success) {
        return { ok: result.data }
      } else {
        console.error("Zod validation error:", result.error.flatten())
        return {
          err: `getBalance: Invalid balance data received. Error: ${result.error.message}`,
        }
      }
    } else {
      return { err: `getBalance: Unable to get balance: ${response.status}` }
    }
  } catch (error) {
    console.error("Fetch error:", error)
    return { err: `getBalance: Network error: ${error}` }
  }
}
