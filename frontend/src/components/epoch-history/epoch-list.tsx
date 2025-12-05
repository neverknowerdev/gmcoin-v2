"use client";

import { CurrentEpochCard } from "./current-epoch-card";
import { FinishedEpochCard } from "./finished-epoch-card";

interface Epoch {
  epochNumber: number;
  isCurrent?: boolean;
  currentDay?: number;
  totalDays?: number;
  startDate?: string;
  endDate?: string;
  mintingDifficulty: string;
}

interface EpochListProps {
  epochs: Epoch[];
  onHowItWorks?: () => void;
}

export function EpochList({ epochs, onHowItWorks }: EpochListProps) {
  return (
    <div className="pb-32">
      {epochs.map((epoch) => {
        if (epoch.isCurrent) {
          return (
            <CurrentEpochCard
              key={epoch.epochNumber}
              epochNumber={epoch.epochNumber}
              currentDay={epoch.currentDay || 0}
              totalDays={epoch.totalDays || 7}
              mintingDifficulty={epoch.mintingDifficulty}
              onHowItWorks={onHowItWorks}
            />
          );
        }
        return (
          <FinishedEpochCard
            key={epoch.epochNumber}
            epochNumber={epoch.epochNumber}
            startDate={epoch.startDate || ""}
            endDate={epoch.endDate || ""}
            mintingDifficulty={epoch.mintingDifficulty}
          />
        );
      })}
    </div>
  );
}

