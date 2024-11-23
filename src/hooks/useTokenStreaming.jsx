import { useState, useCallback } from "react";

export const useTokenStreaming = (initialText = "") => {
  const [streamedText, setStreamedText] = useState(initialText);
  const [currentWord, setCurrentWord] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const processChunk = useCallback((chunk, isNewMessage = false) => {
    setIsStreaming(true);

    // Reset text if this is a new message
    if (isNewMessage) {
      setStreamedText("");
      setIsComplete(false);
    }

    // Split chunk into words while preserving whitespace
    const words = chunk.split(/(\s+)/);

    // Process each word with a delay
    words.forEach((word, index) => {
      setTimeout(() => {
        setCurrentWord(word);
        setStreamedText((prev) => prev + word);

        // If this is the last word in the chunk
        if (index === words.length - 1) {
          setCurrentWord("");
          setIsComplete(true);
        }
      }, index * 15); // 15ms delay between words
    });
  }, []);

  const reset = useCallback(() => {
    setStreamedText("");
    setCurrentWord("");
    setIsStreaming(false);
    setIsComplete(false);
  }, []);

  return {
    streamedText,
    currentWord,
    isStreaming,
    isComplete,
    processChunk,
    reset,
  };
};
