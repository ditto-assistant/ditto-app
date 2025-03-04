import { useContext, createContext, useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  savePromptToFirestore,
  getPromptFromFirestore,
  clearPromptFromFirestore,
} from "@/control/firebase";
import { debounce } from "lodash"; // Make sure lodash is installed

interface PromptData {
  prompt: string;
  image: string;
}

interface PromptStorageContextType {
  promptData: PromptData | null;
  isLoading: boolean;
  error: Error | null;
  savePrompt: (prompt: string, image?: string) => void;
  clearPrompt: () => void;
}

const PromptStorageContext = createContext<PromptStorageContextType | undefined>(undefined);

export function usePromptStorage() {
  const context = useContext(PromptStorageContext);
  if (context === undefined) {
    throw new Error("usePromptStorage must be used within a PromptStorageProvider");
  }
  return context;
}

export function PromptStorageProvider({ children }: { children: React.ReactNode }) {
  const value = usePromptStorageData();
  return (
    <PromptStorageContext.Provider value={value}>
      {children}
    </PromptStorageContext.Provider>
  );
}

function usePromptStorageData(): PromptStorageContextType {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [debounceSave] = useState(() => 
    debounce((userId: string, prompt: string, image: string = "") => {
      savePromptToFirestore(userId, prompt, image);
    }, 1000)
  );

  // Cancel debounced function on unmount
  useEffect(() => {
    return () => {
      debounceSave.cancel();
    };
  }, [debounceSave]);

  // Query to fetch saved prompt
  const query = useQuery({
    queryKey: ["promptStorage", user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new Error("No user");
      const data = await getPromptFromFirestore(user.uid);
      return data || { prompt: "", image: "" };
    },
    enabled: !!user,
  });

  // Mutation to save prompt
  const saveMutation = useMutation({
    mutationFn: async ({ prompt, image = "" }: { prompt: string; image?: string }) => {
      if (!user?.uid) throw new Error("No user");
      
      // If the prompt is empty, clear it from Firestore
      if (prompt.trim() === "" && (!image || image === "")) {
        await clearPromptFromFirestore(user.uid);
        return { prompt: "", image: "" };
      }
      
      // Optimistically update local state immediately
      const updatedData = { prompt, image };
      
      // Debounce the actual save to Firestore
      debounceSave(user.uid, prompt, image);
      
      return updatedData;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["promptStorage", user?.uid], data);
    },
  });

  // Mutation to clear prompt
  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid) throw new Error("No user");
      await clearPromptFromFirestore(user.uid);
      return { prompt: "", image: "" };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["promptStorage", user?.uid], data);
    },
  });

  // Wrapper functions for mutations
  const savePrompt = useCallback((prompt: string, image: string = "") => {
    saveMutation.mutate({ prompt, image });
  }, [saveMutation]);

  const clearPrompt = useCallback(() => {
    clearMutation.mutate();
  }, [clearMutation]);

  return {
    promptData: query.data || null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    savePrompt,
    clearPrompt,
  };
}