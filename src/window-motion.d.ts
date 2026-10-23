export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}
export type DockEdge = "bottom" | "left" | "right";
export type WindowEffect = "genie" | "scale";
export type WindowSnapshot = HTMLCanvasElement | HTMLImageElement | ImageBitmap;
export function genieMesh(
  source: Rect,
  target: Rect,
  progress: number,
  options?: { edge?: DockEdge; slices?: number },
): Array<{ source: Point[]; destination: Point[] }>;
export function animateWindow(
  snapshot: WindowSnapshot,
  source: Rect,
  target: Rect,
  options?: {
    effect?: WindowEffect;
    edge?: DockEdge;
    duration?: number;
    reverse?: boolean;
    reducedMotion?: boolean;
    signal?: AbortSignal;
    onFrame?: (progress: number) => void;
  },
): Promise<boolean>;
export function createWindowTransitions(options: {
  element: HTMLElement;
  target: HTMLElement;
  capture: (context: {
    element: HTMLElement;
    signal: AbortSignal;
  }) => WindowSnapshot | Promise<WindowSnapshot>;
  effect?: WindowEffect;
  edge?: DockEdge;
  duration?: number;
  reducedMotion?: boolean;
}): {
  minimize(): Promise<boolean>;
  restore(): Promise<boolean>;
  readonly state: "visible" | "minimized" | "minimizing" | "restoring";
  configure(options: {
    effect?: WindowEffect;
    edge?: DockEdge;
    duration?: number;
    reducedMotion?: boolean;
  }): void;
  cancel(): void;
  dispose(): void;
};
