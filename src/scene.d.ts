export type MaterialName = "clear" | "regular";
export interface Shape {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  opacity?: number;
  scale?: number;
  group?: string;
  frost?: number;
  tint?: [number, number, number, number];
}
export interface ShapeState extends Shape {
  radius: number;
  opacity: number;
  scale: number;
  group: string;
  frost: number;
}
export interface DistanceField {
  data: Uint8Array;
  width: number;
  height: number;
  range: number;
}
export interface SceneOptions {
  material?: MaterialName;
  quality?: "lite" | "balanced" | "rich";
  renderBackground?: boolean;
  merge?: number;
  pixelRatio?: number;
  ior?: number;
  thickness?: number;
  bevel?: number;
  dispersion?: number;
  roughness?: number;
  frost?: number;
  reflection?: number;
  shadow?: number;
  tint?: [number, number, number, number];
}
export interface TransitionOptions {
  stiffness?: number;
  damping?: number;
  mass?: number;
  reducedMotion?: boolean;
  liquid?: boolean;
}
export interface GlassScene {
  setShapes(shapes: Shape[]): void;
  addShape(shape: Shape): void;
  removeShape(id: string): boolean;
  update(id: string, patch: Partial<Shape>): void;
  transition(
    id: string,
    patch: Partial<Shape>,
    options?: TransitionOptions,
  ): Promise<boolean>;
  morph(
    id: string,
    patch: Partial<Shape>,
    options?: TransitionOptions,
  ): Promise<boolean>;
  configure(options: SceneOptions): void;
  resize(width?: number, height?: number, pixelRatio?: number): void;
  setMask(id: string, field: DistanceField): void;
  setSource(source: HTMLCanvasElement | HTMLImageElement | ImageBitmap): void;
  setLight(x: number, y: number): void;
  render(): void;
  materialize(id: string, options?: TransitionOptions): Promise<boolean>;
  dematerialize(id: string, options?: TransitionOptions): Promise<boolean>;
  getShape(id: string): ShapeState | undefined;
  subscribe(listener: () => void): () => void;
  stats(): {
    draws: number;
    blurBuilds: number;
    activeAnimations: number;
    pendingFrame: boolean;
    shapes: number;
  };
  dispose(): void;
}
export const materials: Readonly<Record<MaterialName, Readonly<SceneOptions>>>;
export function createGlassScene(
  canvas: HTMLCanvasElement,
  source: HTMLCanvasElement | HTMLImageElement | ImageBitmap,
  options?: SceneOptions,
): GlassScene | null;
export function normalizeShape(
  shape: Partial<Shape>,
  index?: number,
): ShapeState;
export function createDistanceField(
  alpha: Uint8Array,
  width: number,
  height: number,
  options?: { range?: number },
): DistanceField;
export function createTextField(
  text: string,
  options?: {
    width?: number;
    height?: number;
    font?: string;
    padding?: number;
    range?: number;
  },
): DistanceField;
export function bindGlassControl(
  element: HTMLElement,
  scene: GlassScene,
  options: {
    id: string;
    canvas: HTMLCanvasElement;
    group?: string;
    radius?: number;
  },
): { sync(): void; dispose(): void };
export function bindGlassRange(
  input: HTMLInputElement,
  scene: GlassScene,
  options: { id: string; canvas: HTMLCanvasElement; size?: number },
): { sync(animate?: boolean): void; dispose(): void };
export function bindGlassSelection(
  container: HTMLElement,
  scene: GlassScene,
  options: {
    id: string;
    canvas: HTMLCanvasElement;
    selected?: string;
    radius?: number;
  },
): { sync(animate?: boolean): void; dispose(): void };
