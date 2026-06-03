"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";

type Options = {
  enabled: boolean;
  message?: string;
  onBlockedNavigation?: () => void;
};

export function useUnsavedChangesGuard({ enabled, message, onBlockedNavigation }: Options) {
  const toast = useToast();
  const lastToastAt = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const warning =
      message ?? "You have unsaved changes. Save or discard them before leaving this page.";

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = warning;
      return warning;
    }

    function notifyBlockedNavigation() {
      const now = Date.now();
      if (now - lastToastAt.current < 1200) {
        return;
      }
      lastToastAt.current = now;
      onBlockedNavigation?.();
      toast.error(warning);
    }

    function onDocumentClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const link = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!link) {
        return;
      }

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }

      if (link.hasAttribute("data-allow-unload")) {
        return;
      }

      notifyBlockedNavigation();
      event.preventDefault();
      event.stopPropagation();
    }

    function onPopState() {
      notifyBlockedNavigation();
      history.pushState(null, "", window.location.href);
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onDocumentClick, true);
    window.addEventListener("popstate", onPopState);
    history.pushState(null, "", window.location.href);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onDocumentClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [enabled, message, onBlockedNavigation, toast]);
}
