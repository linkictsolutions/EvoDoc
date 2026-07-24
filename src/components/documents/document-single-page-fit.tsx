"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

type DocumentSinglePageFitProps = {
  children: ReactNode;
  enabled?: boolean;
};

export function DocumentSinglePageFit({ children, enabled = true }: DocumentSinglePageFitProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) {
      return;
    }

    function fitToPage() {
      if (!outer || !inner) {
        return;
      }

      inner.style.transform = "none";
      inner.style.width = "100%";

      const availableHeight = outer.clientHeight;
      const contentHeight = inner.scrollHeight;
      if (availableHeight <= 0 || contentHeight <= availableHeight) {
        return;
      }

      const scale = Math.max(0.55, availableHeight / contentHeight);
      inner.style.transform = `scale(${scale})`;
      inner.style.transformOrigin = "top left";
      inner.style.width = `${100 / scale}%`;
    }

    fitToPage();

    const observer = new ResizeObserver(() => fitToPage());
    observer.observe(outer);
    observer.observe(inner);

    return () => observer.disconnect();
  }, [enabled, children]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div ref={outerRef} className="document-single-page-fit">
      <div ref={innerRef} className="document-single-page-fit__inner">
        {children}
      </div>
    </div>
  );
}
