import { useEffect, useState } from "react";

export function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    // Set initial size
    const { width, height } = ref.current.getBoundingClientRect();
    setSize({ width, height });

    // Create ResizeObserver to track size changes
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    // Start observing the element
    resizeObserver.observe(ref.current);

    // Clean up observer on unmount
    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return size;
}
