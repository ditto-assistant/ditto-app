import { useState, useCallback, useRef, useEffect } from "react";

export const useTokenStreaming = (initialText = "") => {
  const [streamedText, setStreamedText] = useState(initialText);
  const [currentWord, setCurrentWord] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const timeoutIdsRef = useRef([]);
  const accumulatedTextRef = useRef("");
  const batchQueueRef = useRef([]);
  
  const clearTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];
  }, []);

  const processBatchQueue = useCallback(() => {
    if (batchQueueRef.current.length === 0) {
      setIsComplete(true);
      setIsStreaming(false);
      return;
    }

    const batch = batchQueueRef.current.shift();
    const timeoutId = setTimeout(() => {
      setCurrentWord(batch);
      setStreamedText(prev => {
        const newText = prev + batch;
        accumulatedTextRef.current = newText;
        return newText;
      });
      processBatchQueue();
    }, 50);

    timeoutIdsRef.current.push(timeoutId);
  }, []);

  const processChunk = useCallback((chunk, isNewMessage = false) => {
    if (isNewMessage) {
      clearTimeouts();
      setStreamedText("");
      setIsComplete(false);
      accumulatedTextRef.current = "";
      batchQueueRef.current = [];
    }

    setIsStreaming(true);
    
    // Split chunk into words while preserving whitespace
    const words = chunk.split(/(\s+)/);
    const batchSize = 3;
    
    // Create batches
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize).join("");
      batchQueueRef.current.push(batch);
    }

    // Start processing if not already processing
    if (batchQueueRef.current.length === words.length / batchSize) {
      processBatchQueue();
    }
  }, [clearTimeouts, processBatchQueue]);

  const reset = useCallback(() => {
    clearTimeouts();
    setStreamedText("");
    setCurrentWord("");
    setIsStreaming(false);
    setIsComplete(false);
    accumulatedTextRef.current = "";
    batchQueueRef.current = [];
  }, [clearTimeouts]);

  useEffect(() => {
    return () => clearTimeouts();
  }, [clearTimeouts]);

  return {
    streamedText,
    currentWord,
    isStreaming,
    isComplete,
    processChunk,
    reset,
  };
};
