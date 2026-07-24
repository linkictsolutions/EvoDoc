"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

type DocumentSinglePageFitProps = {
  children: ReactNode;
  enabled?: boolean;
};

const supportsZoom = typeof CSS !== "undefined" && CSS.supports("zoom", "1");

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

    function resetFit() {
      if (!outer || !inner) {
        return;
      }

      inner.style.zoom = "1";
      inner.style.transform = "none";
      inner.style.width = "100%";
      outer.style.height = "";
    }

    function fitToPage() {
      if (!outer || !inner) {
        return;
      }

      resetFit();

      const availableHeight = outer.clientHeight;
      const contentHeight = inner.scrollHeight;
      if (availableHeight <= 0 || contentHeight <= availableHeight) {
        return;
      }

      const scale = Math.max(0.55, availableHeight / contentHeight);

      if (supportsZoom) {
        inner.style.zoom = String(scale);
      } else {
        inner.style.transform = `scale(${scale})`;
        inner.style.transformOrigin = "top left";
        inner.style.width = `${100 / scale}%`;
        outer.style.height = `${availableHeight}px`;
      }
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
