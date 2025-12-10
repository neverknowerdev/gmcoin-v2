import Image from "next/image";

type DifficultyCardProps = {
  mintingDifficulty: number;
};

export function DifficultyCard({ mintingDifficulty }: DifficultyCardProps) {
  return (
    <div className="glass rounded-[28px] border-white/25 bg-white/15 px-6 py-5 text-white shadow-[0_15px_40px_rgba(5,19,38,0.35)] backdrop-blur-2xl">
      <div className="flex items-center gap-4">
        <Image
          src="/images/gmMascot.svg"
          alt="Difficulty mascot"
          width={70}
          height={70}
          className="drop-shadow-lg"
        />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">
            Minting Difficulty
          </p>
          <p className="text-3xl font-semibold">{mintingDifficulty.toLocaleString()}</p>
          <p className="text-xs text-white/60">Dynamic based on daily GM volume.</p>
        </div>
      </div>
    </div>
  );
}

