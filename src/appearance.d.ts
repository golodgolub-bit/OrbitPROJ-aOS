export type Preference = "auto" | boolean;
export interface AppearanceOptions {
  root?: HTMLElement;
  platform?: "macos" | "ios";
  scheme?: "auto" | "light" | "dark";
  reduceMotion?: Preference;
  reduceTransparency?: Preference;
  increaseContrast?: Preference;
}
export interface AppearanceState {
  platform: "macos" | "ios";
  scheme: "light" | "dark";
  reduceMotion: boolean;
  reduceTransparency: boolean;
  increaseContrast: boolean;
}
export interface MaterialOptions {
  family?: "liquid" | "standard";
  variant?: "regular" | "clear" | "ultraThin" | "thin" | "thick";
  size?: "compact" | "large";
  backdrop?: [number, number, number];
}
export interface ResolvedMaterial {
  family: "liquid" | "standard";
  variant: string;
  scheme: "light" | "dark";
  adaptive: boolean;
  foreground: string;
  fill: string;
  blur: number;
  dimming: number;
  border: string;
  shadowOpacity: number;
}
export const appearanceProfile: Readonly<{
  id: string;
  evidence: string;
  fidelity: string;
  liquidVariants: readonly string[];
  standardVariants: readonly string[];
}>;
export function concentricRadius(outerRadius: number, inset: number): number;
export function relativeLuminance(rgb: [number, number, number]): number;
export function contrastRatio(
  a: [number, number, number],
  b: [number, number, number],
): number;
export function resolveMaterial(
  options?: MaterialOptions & Partial<AppearanceState>,
): Readonly<ResolvedMaterial>;
export function createAppearance(options?: AppearanceOptions): {
  state(): AppearanceState;
  configure(options: Omit<AppearanceOptions, "root">): void;
  surface(
    element: HTMLElement,
    options?: MaterialOptions,
  ): {
    update(options: MaterialOptions): Readonly<ResolvedMaterial>;
    dispose(): void;
  };
  scrollEdge(
    scroller: HTMLElement,
    edge: HTMLElement,
    options?: { side?: "top" | "bottom"; extent?: number },
  ): () => void;
  dispose(): void;
};
