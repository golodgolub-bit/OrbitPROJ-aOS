export interface MenuCommand {
  id: string;
  item: HTMLElement;
  event: Event;
}
export function bindMenuBar(
  bar: HTMLElement,
  options?: {
    onCommand?: (command: MenuCommand) => void;
    onOpen?: (context: { trigger: HTMLElement; menu: HTMLElement }) => void;
  },
): {
  open(
    trigger: HTMLElement,
    options?: { focus?: boolean; last?: boolean },
  ): void;
  close(options?: { focus?: boolean }): void;
  readonly isOpen: boolean;
  dispose(): void;
};
export function bindSystemPanel(
  panel: HTMLElement,
  options: { trigger: HTMLElement; onOpen?: () => void; onClose?: () => void },
): {
  open(): void;
  close(options?: { focus?: boolean }): void;
  readonly isOpen: boolean;
  dispose(): void;
};
export function bindDock(
  dock: HTMLElement,
  options?: {
    magnification?: boolean;
    scale?: number;
    radius?: number;
    onActivate?: (command: MenuCommand) => void;
  },
): { configure(options: { magnification: boolean }): void; dispose(): void };
export function bindWindowChrome(
  element: HTMLElement,
  options?: {
    onClose?: (event: Event) => void;
    onMinimize?: (event: Event) => void;
    onZoom?: (event: Event) => void;
    onMove?: (change: { dx: number; dy: number; event: PointerEvent }) => void;
  },
): { dispose(): void };
