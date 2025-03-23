import React from "react";
import { cn } from "~/lib/utils";

export const Skeleton: React.FC<{
  count?: number;
  duration?: number;
  width?: number | null;
  wrapper?: React.FC<{ children: React.ReactNode }> | null;
  height?: number | null;
  circle?: boolean;
  style?: React.CSSProperties;
  className?: string;
  fading?: boolean;
}> = ({
  count = 1,
  duration = 1.2,
  width = null,
  wrapper: Wrapper,
  height = null,
  circle = false,
  style: customStyle,
  className: customClassName,
  fading = false,
}) => {
  const elements = [];

  for (let i = 0; i < count; i++) {
    const style: React.CSSProperties = {};

    if (width !== null) {
      style.width = width;
    }

    if (height !== null) {
      style.height = height;
    }

    if (width !== null && height !== null && circle) {
      style.borderRadius = "50%";
    }

    let baseClasses =
      "bg-gray-200 animate-pulse pointer-events-none absolute h-full left-0 top-0";
    if (customClassName) {
      baseClasses += " " + customClassName;
    }

    elements.push(
      <span
        key={i}
        className={cn(baseClasses, fading ? "opacity-0" : "opacity-100")}
        style={{
          transition: `opacity ${duration}s ease-in-out`,
          ...customStyle,
          ...style,
        }}
      >
        &zwnj;
      </span>,
    );
  }

  return (
    <span>
      {Wrapper
        ? elements.map((element, i) => (
            <Wrapper key={i}>
              {element}
              &zwnj;
            </Wrapper>
          ))
        : elements}
    </span>
  );
};
