import { createContext, useContext, ReactNode } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth, useAuthToken } from "./useAuth";
import { BASE_URL } from "@/firebaseConfig";
import { Memory } from "@/api/getMemories";

interface ConversationResponse {
  messages: Memory[];
  nextCursor: string;
}

interface ConversationContextType {
  messages: Memory[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
}

const ConversationContext = createContext<ConversationContextType | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const tok = useAuthToken();
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery<ConversationResponse>({
    queryKey: ["conversations", user?.uid, tok.data],
    queryFn: async ({ pageParam }) => {
      if (!tok.data) {
        throw new Error("No token found");
      }
      if (!user?.uid) {
        throw new Error("No user ID found");
      }
      const params = new URLSearchParams({
        userId: user?.uid || "",
        limit: "5",
      });
      if (pageParam) {
        params.set("cursor", pageParam as string);
      }
      const response = await fetch(`${BASE_URL}/v1/conversations?${params}`, {
        headers: {
          Authorization: `Bearer ${tok.data}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }
      return response.json() as Promise<ConversationResponse>;
    },
    initialPageParam: "",
    getNextPageParam: (lastPage: ConversationResponse) =>
      lastPage.nextCursor || undefined,
    enabled: !!user?.uid && !!tok.data,
  });

  const messages = data?.pages.flatMap((page) => page.messages) || [];

  const value = {
    messages,
    isLoading,
    isFetchingNextPage,
    hasNextPage: !!hasNextPage,
    fetchNextPage,
    refetch,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversationHistory() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error(
      "useConversationHistory must be used within a ConversationProvider"
    );
  }
  return context;
}
