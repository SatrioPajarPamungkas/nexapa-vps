import { useEffect, useRef, type ChangeEventHandler, type KeyboardEventHandler, type MouseEventHandler } from "react";
import { cn } from "@/lib/cn";

type Props = {
  checked: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  ariaLabel: string;
  className?: string;
  type?: "checkbox" | "radio";
  name?: string;
  indeterminate?: boolean;
  disabled?: boolean;
};

export function SelectionCheckbox({
  checked,
  onChange,
  ariaLabel,
  className,
  type = "checkbox",
  name,
  indeterminate = false,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const stopSurfaceToggle: MouseEventHandler<HTMLInputElement> = (event) => {
    event.stopPropagation();
  };

  const handleEnter: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <input
      ref={inputRef}
      type={type}
      name={name}
      checked={checked}
      disabled={disabled}
      onClick={stopSurfaceToggle}
      onKeyDown={handleEnter}
      onChange={onChange}
      aria-label={ariaLabel}
      aria-checked={indeterminate ? "mixed" : checked}
      className={cn(
        "h-4 w-4 shrink-0 cursor-pointer border-slate-400 bg-white text-blue-600 accent-blue-600 shadow-sm focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 checked:border-blue-600 checked:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50",
        type === "checkbox" && "rounded",
        className,
      )}
    />
  );
}
