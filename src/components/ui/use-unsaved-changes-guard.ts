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
  const enabledRef = useRef(enabled);
  const messageRef = useRef(message);
  const onBlockedNavigationRef = useRef(onBlockedNavigation);
  const bypassNextNavigationRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) {
      bypassNextNavigationRef.current = true;
    }
  }, [enabled]);

  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  useEffect(() => {
    onBlockedNavigationRef.current = onBlockedNavigation;
  }, [onBlockedNavigation]);

  useEffect(() => {
    function warningMessage() {
      return messageRef.current ?? "You have unsaved changes. Save or discard them before leaving this page.";
    }

    function shouldAllowNavigation() {
      if (bypassNextNavigationRef.current) {
        bypassNextNavigationRef.current = false;
        return true;
      }
      return !enabledRef.current;
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (shouldAllowNavigation()) {
        return undefined;
      }
      const warning = warningMessage();
      event.preventDefault();
      event.returnValue = warning;
      return warning;
    }

    function notifyBlockedNavigation() {
      if (shouldAllowNavigation()) {
        return;
      }
      const now = Date.now();
      if (now - lastToastAt.current < 1200) {
        return;
      }
      lastToastAt.current = now;
      onBlockedNavigationRef.current?.();
      toast.error(warningMessage());
    }

    function onDocumentClick(event: MouseEvent) {
      if (shouldAllowNavigation()) {
        return;
      }
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
      if (shouldAllowNavigation()) {
        return;
      }
      notifyBlockedNavigation();
      history.pushState(null, "", window.location.href);
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onDocumentClick, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onDocumentClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [toast]);

  useEffect(() => {
    if (enabled) {
      history.pushState(null, "", window.location.href);
    }
  }, [enabled]);
}
