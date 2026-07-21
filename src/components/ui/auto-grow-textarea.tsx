"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type MutableRefObject,
  type TextareaHTMLAttributes,
} from "react";

function resize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

/**
 * Textarea that grows in height as content wraps to new lines instead of
 * showing an inner scrollbar at a fixed height. Compatible with
 * react-hook-form's `register` (forwards ref, chains onChange).
 */
export const AutoGrowTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function AutoGrowTextarea({ onChange, ...props }, ref) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }
    },
    [ref],
  );

  useEffect(() => {
    resize(innerRef.current);
  });

  return (
    <textarea
      {...props}
      ref={setRefs}
      onChange={(event) => {
        resize(event.currentTarget);
        onChange?.(event);
      }}
    />
  );
});
