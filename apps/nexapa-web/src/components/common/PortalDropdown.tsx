import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PortalDropdownProps = {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: { current: HTMLButtonElement | null };
  children: React.ReactNode;
  align?: "left" | "right";
};

export function PortalDropdown({
  isOpen,
  onClose,
  triggerRef,
  children,
  align = "right",
}: PortalDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, transformOrigin: "top center" });

  // Calculate position when dropdown opens or window resizes
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const dropdownHeight = dropdownRef.current?.offsetHeight || 0;
      const dropdownWidth = dropdownRef.current?.offsetWidth || 200;

      // Calculate position with viewport collision detection
      let top = triggerRect.bottom + 4; // 4px gap
      let left = align === "right"
        ? triggerRect.right - dropdownWidth
        : triggerRect.left;
      let transformOrigin = "top center";

      // Check if dropdown would go below viewport
      if (top + dropdownHeight > window.innerHeight) {
        // Position above trigger instead
        top = triggerRect.top - dropdownHeight - 4;
        transformOrigin = "bottom center";
      }

      // Check horizontal boundaries
      if (left < 0) {
        left = 4; // Small margin from left edge
      } else if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 4; // Small margin from right edge
      }

      setPosition({ top, left, transformOrigin });
    };

    updatePosition();

    // Add event listeners for repositioning
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, triggerRef, align]);

  // Close on Escape key or outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current !== event.target
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[1000] w-48 origin-top-right rounded-2xl border border-white/20 bg-white/80 py-1.5 shadow-[0_18px_55px_rgba(2,6,23,0.18)] backdrop-blur-2xl ring-1 ring-white/10"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transformOrigin: position.transformOrigin,
      }}
    >
      {children}
    </div>,
    document.body
  );
}