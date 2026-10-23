import { useEffect, useRef, type PropsWithChildren } from "react";
import { createAppearance, bindMenuBar } from "@qqduck/aos";
import "@qqduck/aos/styles.css";
// Keep your own markup, routing, state, commands and accessible controls.
export function Appearance({ children }: PropsWithChildren) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current) return;
    const appearance = createAppearance({ root: root.current });
    return () => appearance.dispose();
  }, []);
  return <div ref={root}>{children}</div>;
}
export function MenuBar({ children }: PropsWithChildren) {
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!bar.current) return;
    const binding = bindMenuBar(bar.current, {
      onCommand: ({ id }) => console.log(id),
    });
    return () => binding.dispose();
  }, []);
  // Panels referenced by aria-controls must be mounted before binding.
  return (
    <nav ref={bar} aria-label="Application" className="aos-menubar">
      {children}
    </nav>
  );
}
