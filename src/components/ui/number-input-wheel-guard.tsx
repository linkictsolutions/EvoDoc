"use client";

import { useEffect } from "react";

export function NumberInputWheelGuard() {
  useEffect(() => {
    function onWheel(event: WheelEvent) {
      const active = document.activeElement;
      if (!(active instanceof HTMLInputElement) || active.type !== "number") {
        return;
      }

      if (event.target instanceof Node && !active.contains(event.target)) {
        return;
      }

      active.blur();
      event.preventDefault();
    }

    document.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      document.removeEventListener("wheel", onWheel, true);
    };
  }, []);

  return null;
}
