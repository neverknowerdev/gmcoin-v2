"use client";

export function EpochBackground() {
  return (
    <div
      className="absolute inset-0 z-0 fixed"
      style={{
        backgroundImage: "url(/images/history-bg.svg)",
        backgroundSize: "100vw 100%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center top",
        top: "140px",
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: "calc(100vh)",
      }}
    />
  );
}

