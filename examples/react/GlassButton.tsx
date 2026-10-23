import { useEffect, useRef, type ButtonHTMLAttributes } from "react";
import { enhance } from "@qqduck/aos/controls";
import "@qqduck/aos/controls.css";
export function GlassButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (ref.current) return enhance(ref.current);
  }, []);
  return (
    <button
      {...props}
      ref={ref}
      data-aos
      className={`aos-button ${className}`}
    />
  );
}
