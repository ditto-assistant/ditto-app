import { useState, useEffect } from "react";

export function useMemoryCount() {
  const [count, setCount] = useState(() => {
    return parseInt(localStorage.getItem("histCount")) || 0;
  });

  useEffect(() => {
    const updateCount = () => {
      const newCount = parseInt(localStorage.getItem("histCount")) || 0;
      setCount(newCount);
    };

    // Listen for both storage changes and our custom event
    window.addEventListener("storage", updateCount);
    window.addEventListener("memoryCountUpdated", updateCount);

    return () => {
      window.removeEventListener("storage", updateCount);
      window.removeEventListener("memoryCountUpdated", updateCount);
    };
  }, []);

  return { count };
}
