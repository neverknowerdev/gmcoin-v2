"use client";

import Image from "next/image";
import { useEffect, useState, type PropsWithChildren } from "react";
import clsx from "clsx";

const PRELOAD_SCREENS = [
  { id: "sunrise", className: "sunrise-card", duration: 1100 },
  { id: "ocean", className: "aurora-card", duration: 1100 },
  { id: "fusion", className: "horizon-card", duration: 1000 },
];

export function PreloadSequence({ children }: PropsWithChildren) {
  const [step, setStep] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (isDone) return;
    const screen = PRELOAD_SCREENS[step];
    const timer = setTimeout(() => {
      if (step >= PRELOAD_SCREENS.length - 1) {
        setIsDone(true);
      } else {
        setStep((prev) => prev + 1);
      }
    }, screen.duration);
    return () => clearTimeout(timer);
  }, [isDone, step]);

  if (!isDone) {
    const screen = PRELOAD_SCREENS[step];
    return (
      <div
        className={clsx(
          "preload-panel fixed inset-0 z-50 flex items-center justify-center overflow-hidden",
          screen.className
        )}
      >
        <span className="gm-blob-overlay" />
        <Image
          src="/images/Ellipse.svg"
          alt="Gradient ellipse overlay"
          fill
          priority
          className="ellipse-overlay object-cover"
        />
        <div className="relative flex items-center justify-center">
          <Image
            src="/images/gmCup.svg"
            alt="GM coin cup mascot"
            width={180}
            height={200}
            priority
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

