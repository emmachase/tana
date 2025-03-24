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

export function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const { innerWidth, innerHeight } = window;
    setSize({ width: innerWidth, height: innerHeight });

    const handleResize = () => {
      const { innerWidth, innerHeight } = window;
      setSize({ width: innerWidth, height: innerHeight });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return size;
}

export function useIsMobile() {
  const { width } = useWindowSize();
  return width < 768;
}
