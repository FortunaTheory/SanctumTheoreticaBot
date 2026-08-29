import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ActivityType, Client } from "discord.js";

type ActivityMood = "analytical" | "obsessed";
type ActivityEntry = {
  type: "watching" | "listening";
  name: string;
  mood: ActivityMood;
};

let activitiesPromise: Promise<readonly ActivityEntry[]> | undefined;

function loadActivities(): Promise<readonly ActivityEntry[]> {
  activitiesPromise ??= readFile(resolve(process.cwd(), "data", "activities.json"), "utf8")
    .then((contents): unknown => JSON.parse(contents))
    .then((value): readonly ActivityEntry[] => {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error("data/activities.json muss mindestens eine Activity enthalten.");
      }
      return value.map((activity, index) => {
        if (typeof activity !== "object" || activity === null || Array.isArray(activity)) {
          throw new Error(`data/activities.json[${index}] ist ungültig.`);
        }
        const entry = activity as Record<string, unknown>;
        if ((entry.type !== "watching" && entry.type !== "listening")
          || (entry.mood !== "analytical" && entry.mood !== "obsessed")
          || typeof entry.name !== "string" || !entry.name.trim()) {
          throw new Error(`data/activities.json[${index}] enthält ungültige Werte.`);
        }
        return { type: entry.type, mood: entry.mood, name: entry.name };
      });
    });
  return activitiesPromise;
}

const symbolByMood: Record<ActivityMood, string> = {
  analytical: "◈",
  obsessed: "∴"
};

export function startActivityRotation(client: Client): NodeJS.Timeout {
  let lastActivityName: string | undefined;

  const update = async () => {
    try {
      const activities = await loadActivities();
    const candidates = activities.filter((activity) => activity.name !== lastActivityName);
    const analytical = candidates.filter((activity) => activity.mood === "analytical");
    const pool = analytical.length > 0 && Math.random() < 0.7 ? analytical : candidates;
    const activity = pool[Math.floor(Math.random() * pool.length)];
      if (!activity) throw new Error("Keine passende Activity verfügbar.");
    lastActivityName = activity.name;
      await client.user?.setPresence({
      activities: [{
        name: `${symbolByMood[activity.mood]} ${activity.name}`,
        type: activity.type === "watching" ? ActivityType.Watching : ActivityType.Listening
      }],
      status: "dnd"
    });
    } catch (error) {
      console.error("Activity konnte nicht aktualisiert werden:", error);
    }
  };

  void update();
  const scheduleNext = () => setTimeout(() => {
    void update().finally(() => scheduleNext());
  }, 15 * 60 * 1000 + Math.random() * 30 * 60 * 1000);
  const timer = scheduleNext();
  return timer as NodeJS.Timeout;
}
