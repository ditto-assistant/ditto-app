import { useState, useEffect, useContext, createContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  saveModelPreferencesToFirestore,
  getModelPreferencesFromFirestore,
} from "@/control/firebase";
import { DEFAULT_PREFERENCES } from "@/constants";
import { ModelPreferences } from "@/types/llm";

export type ModelPreferencesHook = {
  preferences: ModelPreferences;
  loading: boolean;
  error: string | null;
  updatePreferences: (preferences: Partial<ModelPreferences>) => Promise<void>;
};
const ModelPreferencesContext = createContext<ModelPreferencesHook | undefined>(
  undefined
);

export function useModelPreferences(): ModelPreferencesHook {
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
  const { preferences, loading, error, updatePreferences } = useModels();
  return (
    <ModelPreferencesContext.Provider
      value={{
        preferences,
        loading,
        error,
        updatePreferences,
      }}
    >
      {children}
    </ModelPreferencesContext.Provider>
  );
}

function useModels() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    async function loadPreferences() {
      try {
        if (!user) return;
        const prefs = await getModelPreferencesFromFirestore(user.uid);
        if (prefs) {
          setPreferences(prefs);
          console.log("loadedPrefs", prefs);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, [user]);

  async function updatePreferences(newPreferences: Partial<ModelPreferences>) {
    try {
      setPreferences((prev) => {
        if (!user) return prev;
        const updated = { ...prev, ...newPreferences };
        console.log("updatedPrefs", updated);
        saveModelPreferencesToFirestore(user.uid, updated);
        return updated;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      throw err;
    }
  }

  return { preferences, loading, error, updatePreferences };
}
