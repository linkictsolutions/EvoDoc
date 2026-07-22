"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const COLLAPSE_THRESHOLD = 56;
const EXPAND_THRESHOLD = 10;

const WorkspaceScrollContext = createContext(false);

export function useWorkspaceScrollCollapsed() {
  return useContext(WorkspaceScrollContext);
}

export function WorkspaceScrollProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsCollapsed(false);
      return;
    }

    const shell = document.querySelector<HTMLElement>(".app-content-shell");
    if (!shell) {
      return;
    }

    const onScroll = () => {
      const scrollTop = shell.scrollTop;
      setIsCollapsed((current) => {
        if (!current && scrollTop > COLLAPSE_THRESHOLD) {
          return true;
        }
        if (current && scrollTop < EXPAND_THRESHOLD) {
          return false;
        }
        return current;
      });
    };

    shell.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      shell.removeEventListener("scroll", onScroll);
    };
  }, [enabled]);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".app-content-shell.has-workspace-scroll");
    if (!shell) {
      return;
    }

    shell.classList.toggle("is-header-collapsed", enabled && isCollapsed);

    return () => {
      shell.classList.remove("is-header-collapsed");
    };
  }, [enabled, isCollapsed]);

  return (
    <WorkspaceScrollContext.Provider value={enabled && isCollapsed}>
      {children}
    </WorkspaceScrollContext.Provider>
  );
}
