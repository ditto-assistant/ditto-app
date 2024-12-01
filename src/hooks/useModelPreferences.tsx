import { useContext, createContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  saveModelPreferencesToFirestore,
  getModelPreferencesFromFirestore,
} from "@/control/firebase";
import { DEFAULT_PREFERENCES } from "@/constants";

const ModelPreferencesContext = createContext<
  ReturnType<typeof useModels> | undefined
>(undefined);

export function useModelPreferences() {
  const context = useContext(ModelPreferencesContext);
  if (context === undefined) {
    throw new Error(
      "useModelPreferences must be used within a ModelPreferencesProvider"
    );
  }
  return context;
}

export function ModelPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useModels();
  return (
    <ModelPreferencesContext.Provider value={value}>
      {children}
    </ModelPreferencesContext.Provider>
  );
}

function useModels() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["modelPreferences", user?.uid],
    queryFn: async () => {
      if (!user) throw new Error("No user");
      const prefs = await getModelPreferencesFromFirestore(user.uid);
      return prefs || DEFAULT_PREFERENCES;
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (newPreferences: Partial<typeof DEFAULT_PREFERENCES>) => {
      if (!user) throw new Error("No user");
      const updatedPreferences = {
        ...(query.data || DEFAULT_PREFERENCES),
        ...newPreferences,
      };
      await saveModelPreferencesToFirestore(user.uid, updatedPreferences);
      return updatedPreferences;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["modelPreferences", user?.uid], data);
    },
  });

  return {
    ...query,
    preferences: query.data,
    updatePreferences: mutation.mutate,
  };
}
