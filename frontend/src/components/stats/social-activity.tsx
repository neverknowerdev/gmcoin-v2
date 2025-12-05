"use client";

interface SocialActivityProps {
  gmTweets: string;
  gmCasts: string;
}

export function SocialActivity({ gmTweets, gmCasts }: SocialActivityProps) {
  return (
    <div className="mx-4 mb-4 rounded-2xl bg-white p-5 shadow-sm">
      <h2
        className="text-3xl font-bold text-black mb-4"
        style={{ fontFamily: "var(--font-anton), sans-serif" }}
      >
        Your social activity
      </h2>

      <div className="flex items-center gap-4">
        {/* GM tweets this week */}
        <div className="">
          <p className="text-sm text-gray-600 mb-2">GM tweets this week</p>
          <p
            className="text-3xl text-black"
            style={{ fontFamily: "var(--font-anton), sans-serif" }}
          >
            {gmTweets}
          </p>
        </div>

        {/* GM casts this week */}
        <div>
          <p className="text-sm text-gray-600 mb-2">GM casts this week</p>
          <p
            className="text-3xl text-black"
            style={{ fontFamily: "var(--font-anton), sans-serif" }}
          >
            {gmCasts}
          </p>
        </div>
      </div>
    </div>
  );
}
