import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ActivityType, Client } from "discord.js";

type ActivityMood = "analytical" | "obsessed";
type ActivityEntry = {
  type: "watching" | "listening";
  name: string;
  mood: ActivityMood;
};

const activities: readonly ActivityEntry[] = JSON.parse(
  await readFile(resolve(process.cwd(), "data", "activities.json"), "utf8")
);

const symbolByMood: Record<ActivityMood, string> = {
  analytical: "◈",
  obsessed: "∴"
};

export function startActivityRotation(client: Client): NodeJS.Timeout {
  let lastActivityName: string | undefined;

  const update = () => {
    const candidates = activities.filter((activity) => activity.name !== lastActivityName);
    const analytical = candidates.filter((activity) => activity.mood === "analytical");
    const pool = analytical.length > 0 && Math.random() < 0.7 ? analytical : candidates;
    const activity = pool[Math.floor(Math.random() * pool.length)];
    lastActivityName = activity.name;
    client.user?.setPresence({
      activities: [{
        name: `${symbolByMood[activity.mood]} ${activity.name}`,
        type: activity.type === "watching" ? ActivityType.Watching : ActivityType.Listening
      }],
      status: "dnd"
    });
  };

  update();
  const scheduleNext = () => setTimeout(() => {
    update();
    scheduleNext();
  }, 15 * 60 * 1000 + Math.random() * 30 * 60 * 1000);
  const timer = scheduleNext();
  return timer as NodeJS.Timeout;
}
