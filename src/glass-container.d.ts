import type {
  GlassScene,
  SceneOptions,
  TransitionOptions,
  Shape,
} from "./scene.js";
type Source = HTMLCanvasElement | HTMLImageElement | ImageBitmap;
export interface GlassMoveOptions extends TransitionOptions {
  transition?: "matchedGeometry" | "materialize" | "none";
}
export interface GlassContainer {
  readonly scene: GlassScene;
  register(
    id: string,
    element: HTMLElement,
    options?: Partial<Shape> & { appear?: boolean },
  ): {
    move(element: HTMLElement, options?: GlassMoveOptions): Promise<boolean>;
    sync(): void;
    remove(
      options?: TransitionOptions & { animate?: boolean },
    ): Promise<boolean>;
  };
  move(
    id: string,
    element: HTMLElement,
    options?: GlassMoveOptions,
  ): Promise<boolean>;
  remove(
    id: string,
    options?: TransitionOptions & { animate?: boolean },
  ): Promise<boolean>;
  sync(id?: string): void;
  configure(options: SceneOptions & { spacing?: number }): void;
  setSource(source: Source): void;
  dispose(): void;
}
export function createGlassContainer(
  canvas: HTMLCanvasElement,
  source: Source,
  options?: SceneOptions & { spacing?: number },
): GlassContainer | null;
