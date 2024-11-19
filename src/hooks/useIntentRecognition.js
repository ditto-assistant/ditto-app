import { useState, useEffect, useContext, createContext } from "react";
import IntentRecognition from "../control/intent/intentRecognition";

/**
 * Access the IntentRecognition context.
 *
 * @returns {{isLoaded: boolean, models: IntentRecognition}} An object containing:
 *   - isLoaded: A boolean indicating whether all intent models have finished loading.
 *   - models: The IntentRecognition instance containing all intent models.
 * @throws {Error} Throws an error if used outside of an IntentRecognitionProvider.
 */
export function useIntentRecognition() {
  const context = useContext(IntentRecognitionContext);
  if (context === undefined) {
    throw new Error(
      "useIntentRecognition must be used within an IntentRecognitionProvider",
    );
  }
  return context;
}

const IntentRecognitionContext = createContext();

export function IntentRecognitionProvider({ children }) {
  const [intentRecognition] = useState(() => new IntentRecognition());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    intentRecognition
      .loadModels()
      .then(() => {
        setIsLoaded(true);
      })
      .catch((error) => {
        console.error("Error loading intent recognition models:", error);
        setIsLoaded(false);
      });

    // Cleanup function
    return () => {
      intentRecognition.dispose();
    };
  }, [intentRecognition]);

  return (
    <IntentRecognitionContext.Provider
      value={{ isLoaded, models: intentRecognition }}
    >
      {children}
    </IntentRecognitionContext.Provider>
  );
}
