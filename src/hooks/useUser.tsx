import { useQuery } from "@tanstack/react-query"
import { getUser, User } from "@/api/getUser"

export function useUser() {
  return useQuery<User, Error>({
    queryKey: ["user"],
    queryFn: async () => {
      const result = await getUser()
      if (result.err) {
        throw new Error(result.err)
      }
      if (!result.ok) {
        throw new Error("No data returned")
      }
      return result.ok
    },
  })
}
