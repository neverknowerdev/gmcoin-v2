import { achievements } from "./data";
import { AchievementCard } from "./achievement-card";

export function AchievementList() {
  return (
    <section className="space-y-5">
      {achievements.map((achievement) => (
        <AchievementCard key={achievement.id} achievement={achievement} />
      ))}
    </section>
  );
}

