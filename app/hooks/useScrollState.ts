import { useEffect, useLayoutEffect } from "react";

import { useState } from "react";

export function useScrollState() {
  const [scrolled, setScrolled] = useState(false);

  useLayoutEffect(() => {
    setScrolled(window.scrollY > 0);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return scrolled;
}
