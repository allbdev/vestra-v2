import { useEffect, useState } from "react";

/**
 * Returns a value that only updates after `delay` ms of no further changes.
 * Use for search inputs, resize listeners, etc.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
