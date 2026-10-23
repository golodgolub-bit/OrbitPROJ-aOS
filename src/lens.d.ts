export interface LensOptions {
  radius?: number;
  strength?: number;
  blur?: number;
  rim?: number;
  pointerX?: number;
  pointerY?: number;
}
export interface GlassLens {
  render(options?: LensOptions): void;
  setSource(source: HTMLImageElement | HTMLCanvasElement | ImageBitmap): void;
  dispose(): void;
}
export function createGlassLens(
  canvas: HTMLCanvasElement,
  source: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  options?: LensOptions,
): GlassLens | null;
