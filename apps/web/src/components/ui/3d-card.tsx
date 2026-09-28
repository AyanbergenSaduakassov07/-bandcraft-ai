"use client";

// Aceternity 3D card, restyled: typed props, ease-out instead of linear, and no tilt
// under prefers-reduced-motion or on touch (hover: none) devices.

import { cn } from "@/lib/utils";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";

const MouseEnterContext = createContext<boolean | undefined>(undefined);

function canTilt() {
  return window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches;
}

export const CardContainer = ({
  children,
  className,
  containerClassName,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseEntered, setIsMouseEntered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !canTilt()) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 25;
    const y = (e.clientY - top - height / 2) / 25;
    containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
  };

  const handleMouseEnter = () => {
    if (canTilt()) setIsMouseEntered(true);
  };

  const handleMouseLeave = () => {
    setIsMouseEntered(false);
    if (containerRef.current) {
      containerRef.current.style.transform = "rotateY(0deg) rotateX(0deg)";
    }
  };

  return (
    <MouseEnterContext.Provider value={isMouseEntered}>
      <div
        className={cn("flex items-center justify-center", containerClassName)}
        style={{ perspective: "1000px" }}
      >
        <div
          ref={containerRef}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "relative flex items-center justify-center transition-transform duration-200 ease-out",
            className,
          )}
          style={{ transformStyle: "preserve-3d" }}
        >
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  );
};

export const CardBody = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("[transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]", className)}>
      {children}
    </div>
  );
};

type CardItemProps = {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  translateX?: number;
  translateY?: number;
  translateZ?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
} & Omit<React.HTMLAttributes<HTMLElement>, "children" | "className">;

export const CardItem = ({
  as: Tag = "div",
  children,
  className,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  ...rest
}: CardItemProps) => {
  const ref = useRef<HTMLElement>(null);
  const isMouseEntered = useMouseEnter();

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.transform = isMouseEntered
      ? `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`
      : "none";
  }, [isMouseEntered, translateX, translateY, translateZ, rotateX, rotateY, rotateZ]);

  return (
    <Tag ref={ref} className={cn("w-fit transition-transform duration-200 ease-out", className)} {...rest}>
      {children}
    </Tag>
  );
};

export const useMouseEnter = () => {
  const context = useContext(MouseEnterContext);
  if (context === undefined) {
    throw new Error("useMouseEnter must be used within a CardContainer");
  }
  return context;
};
