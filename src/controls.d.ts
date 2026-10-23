export type Quality = "lite" | "balanced" | "rich";
export interface SpringOptions {
  from?: number;
  to?: number;
  stiffness?: number;
  damping?: number;
  mass?: number;
  velocity?: number;
  epsilon?: number;
  maxDuration?: number;
  reducedMotion?: boolean;
}
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}
export function clamp(value: number, min: number, max: number): number;
export function lerp(a: number, b: number, t: number): number;
export function springState(
  time: number,
  from: number,
  to: number,
  options?: Omit<SpringOptions, "from" | "to">,
): { value: number; velocity: number };
export function ribbonRows(
  source: Rect,
  target: Rect,
  progress: number,
  slices?: number,
): Array<{
  sy: number;
  sh: number;
  x: number;
  y: number;
  width: number;
  height: number;
}>;
export function capabilities(): {
  backdrop: boolean;
  reducedMotion: boolean;
  popover: boolean;
};
export function configure(options?: {
  root?: HTMLElement;
  quality?: Quality;
  theme?: "auto" | "light" | "dark";
  transparency?: "auto" | "off" | "on";
}): void;
export function enhance(root?: Document | Element): () => void;
export function animateSpring(
  update: (value: number) => void,
  options?: SpringOptions,
): { cancel(): void; finished: Promise<boolean> };
export function minimizeTo(
  source: HTMLElement,
  target: HTMLElement,
  options?: { duration?: number; reducedMotion?: boolean },
): Promise<() => Promise<void>>;
export function ribbonTo(
  snapshot: HTMLCanvasElement | HTMLImageElement | ImageBitmap,
  source: Rect,
  target: Rect,
  options?: {
    duration?: number;
    slices?: number;
    reverse?: boolean;
    reducedMotion?: boolean;
  },
): Promise<void>;
export function toast(
  message: string,
  options?: { duration?: number; root?: HTMLElement },
): () => void;
