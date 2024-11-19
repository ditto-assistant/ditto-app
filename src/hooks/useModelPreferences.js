import { useState, useEffect, useContext, createContext } from "react";
import { useAuth } from "./useAuth";
import {
  saveModelPreferencesToFirestore,
  getModelPreferencesFromFirestore,
} from "../control/firebase";
import { DEFAULT_PREFERENCES } from "@/constants";

const ModelPreferencesContext = createContext();

/** @typedef {import('../types').ModelPreferences} ModelPreferences */

/**
 * Access the model preferences context.
 *
 * @returns {{
 *   preferences: ModelPreferences,
 *   loading: boolean,
 *   error: string | null,
 *   updatePreferences: (preferences: Partial<ModelPreferences>) => Promise<void>
 * }}
 * @throws {Error} Throws an error if used outside of a ModelPreferencesProvider
 */
export function useModelPreferences() {
  const context = useContext(ModelPreferencesContext);
  if (context === undefined) {
    throw new Error(
      "useModelPreferences must be used within a ModelPreferencesProvider"
    );
  }
  return context;
}

export function ModelPreferencesProvider({ children }) {
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
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    async function loadPreferences() {
      try {
        const prefs = await getModelPreferencesFromFirestore(user.uid);
        if (prefs) {
          setPreferences(prefs);
          console.log("loadedPrefs", prefs);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, [user]);

  /**
   * Updates the model preferences for the current user
   * @param {Partial<ModelPreferences>} newPreferences - The new preferences to merge with existing ones
   * @returns {Promise<void>}
   */
  const updatePreferences = async (newPreferences) => {
    try {
      setPreferences((prev) => {
        const updated = { ...prev, ...newPreferences };
        console.log("updatedPrefs", updated);
        saveModelPreferencesToFirestore(user.uid, updated);
        return updated;
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { preferences, loading, error, updatePreferences };
}
