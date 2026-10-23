export interface NavigationStack {
  push(id: string): Promise<boolean>;
  replace(id: string): Promise<boolean>;
  pop(): Promise<boolean>;
  reset(id?: string): void;
  cancel(): void;
  readonly stack: string[];
  readonly busy: boolean;
  beginBackGesture(): {
    update(progress: number): void;
    finish(commit: boolean): Promise<boolean>;
    cancel(): void;
  } | null;
  dispose(): void;
}
export function createNavigationStack(
  root: HTMLElement,
  options?: {
    initial?: string;
    onChange?: (state: { id: string; stack: string[] }) => void;
    duration?: number;
    reducedMotion?: "auto" | boolean;
  },
): NavigationStack;
export function bindBackGesture(
  root: HTMLElement,
  navigation: NavigationStack,
  options?: { edgeWidth?: number },
): { dispose(): void };
export function bindNavigationBar(
  bar: HTMLElement,
  scroller: HTMLElement,
  options?: { collapseDistance?: number },
): { update(): void; dispose(): void };
export function bindTabBar(
  bar: HTMLElement,
  options?: {
    onSelect?: (tab: { id: string; item: HTMLElement }) => void;
    selected?: string;
    scroller?: HTMLElement;
    minimizeOnScroll?: boolean;
  },
): {
  select(id: string, options?: { focus?: boolean; notify?: boolean }): void;
  dispose(): void;
};
export function createSheet(
  dialog: HTMLDialogElement,
  options?: {
    detents?: number[];
    initial?: number;
    dismissible?: boolean;
    onChange?: (state: { index: number; fraction: number }) => void;
    reducedMotion?: "auto" | boolean;
  },
): {
  open(options?: { focus?: HTMLElement }): void;
  close(): void;
  snap(index: number): void;
  readonly index: number;
  dispose(): void;
};
