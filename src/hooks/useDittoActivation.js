import { useState, useEffect, useContext, createContext } from "react";
import HeyDitto from "../control/activation/heyDitto";
/**
 * Access the DittoActivation context.
 *
 * @returns {{isLoaded: boolean, model: HeyDitto}} An object containing:
 *   - isLoaded: A boolean indicating whether the DittoActivation model has finished loading.
 *   - model: The HeyDitto instance for voice activation.
 * @throws {Error} Throws an error if used outside of a DittoActivationProvider.
 */
export function useDittoActivation() {
  const context = useContext(DittoActivationContext);
  if (context === undefined) {
    throw new Error(
      "useDittoActivation must be used within a DittoActivationProvider",
    );
  }
  return context;
}

const DittoActivationContext = createContext();

export function DittoActivationProvider({ children }) {
  const [DittoActivation] = useState(() => new HeyDitto());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    DittoActivation.loadModel().then(() => {
      setIsLoaded(true);
    });
  }, [DittoActivation]);

  return (
    <DittoActivationContext.Provider
      value={{ isLoaded, model: DittoActivation }}
    >
      {children}
    </DittoActivationContext.Provider>
  );
}
