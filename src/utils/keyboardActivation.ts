import type { KeyboardEvent } from "react";

export function activateOnEnterOrSpace<T extends HTMLElement>(
  event: KeyboardEvent<T>,
  action: () => void,
): void {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  action();
}
