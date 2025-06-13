import { useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for debouncing function calls
 */
export function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback as T;
}

/**
 * Custom hook for auto-saving input
 */
export function useAutoSave<T>(
  value: T,
  onSave: (value: T) => void,
  delay: number = 1000
) {
  const debouncedSave = useDebounce(onSave, delay);

  useEffect(() => {
    if (value) {
      debouncedSave(value);
    }
  }, [value, debouncedSave]);
}

/**
 * Custom hook for managing AI chat state
 */
export function useChatState() {
  const abortControllerRef = useRef<AbortController>();

  const createAbortSignal = useCallback(() => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  }, []);

  const cancelCurrentRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    createAbortSignal,
    cancelCurrentRequest
  };
}
