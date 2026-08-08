const INTERACTIVE_SELECTION_TARGET = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  '[contenteditable="true"]',
  '[role="button"]',
  "[data-selection-ignore]",
].join(", ");

export function isInteractiveSelectionTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE_SELECTION_TARGET) !== null;
}

export function isSelectionToggleKey(key: string): boolean {
  return key === "Enter" || key === " ";
}
