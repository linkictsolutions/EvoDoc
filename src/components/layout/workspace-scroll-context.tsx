"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const COLLAPSE_THRESHOLD = 72;
const EXPAND_THRESHOLD = 12;
const TRANSITION_LOCK_MS = 420;

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
  const lockedUntilRef = useRef(0);

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
      if (Date.now() < lockedUntilRef.current) {
        return;
      }

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

  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>(".app-content-shell.has-workspace-scroll");
    if (!shell) {
      return;
    }

    const toolbar = shell.querySelector<HTMLElement>(".app-toolbar");
    const shouldCollapse = enabled && isCollapsed;
    const wasCollapsed = shell.classList.contains("is-header-collapsed");

    if (shouldCollapse === wasCollapsed) {
      return;
    }

    const scrollBefore = shell.scrollTop;
    const heightBefore = toolbar?.getBoundingClientRect().height ?? 0;

    shell.classList.toggle("is-header-collapsed", shouldCollapse);

    const heightAfter = toolbar?.getBoundingClientRect().height ?? 0;
    const heightDelta = heightBefore - heightAfter;

    if (heightDelta !== 0) {
      shell.scrollTop = scrollBefore + heightDelta;
    }

    lockedUntilRef.current = Date.now() + TRANSITION_LOCK_MS;
  }, [enabled, isCollapsed]);

  useEffect(() => {
    if (enabled) {
      return;
    }

    const shell = document.querySelector<HTMLElement>(".app-content-shell");
    shell?.classList.remove("is-header-collapsed");
  }, [enabled]);

  return (
    <WorkspaceScrollContext.Provider value={enabled && isCollapsed}>
      {children}
    </WorkspaceScrollContext.Provider>
  );
}
