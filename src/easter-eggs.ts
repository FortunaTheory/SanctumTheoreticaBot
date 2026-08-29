const profileWindowStartMinutes = 23 * 60 + 15;
const profileWindowEndMinutes = 23 * 60 + 30;
const profileWindowLimitMs = 90 * 1000;
const targetProfileUserId = "262371849806020608";

const profileTriggers = new Map<string, { targetUserId: string; timestamp: number }>();

export function registerProfileLookup(userId: string, targetUserId: string, now = Date.now()): void {
  const minutes = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  if (minutes < profileWindowStartMinutes || minutes > profileWindowEndMinutes) {
    profileTriggers.delete(userId);
    return;
  }

  if (targetUserId !== targetProfileUserId) {
    profileTriggers.delete(userId);
    return;
  }

  profileTriggers.set(userId, { targetUserId, timestamp: now });
}

export function consumeFragmentEasterEgg(userId: string, targetUserId: string, now = Date.now()): { text: string; image: string } | undefined {
  const record = profileTriggers.get(userId);
  if (!record || record.targetUserId !== targetProfileUserId || targetUserId !== targetProfileUserId) {
    return undefined;
  }

  const elapsed = now - record.timestamp;
  if (elapsed > profileWindowLimitMs) {
    profileTriggers.delete(userId);
    return undefined;
  }

  const minutes = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  if (minutes < profileWindowStartMinutes || minutes > profileWindowEndMinutes) {
    profileTriggers.delete(userId);
    return undefined;
  }

  profileTriggers.delete(userId);
  return {
    text: [
      "Die Stimme war nicht aus dem Nichts.",
      "Sie blieb nur in der Stunde zwischen dem letzten Schimmer und dem ersten Schweigen.",
      "",
      "Ein verführerischer Schatten blieb im Archiv zurück,",
      "nicht als Warnung, sondern als Erinnerung.",
      "",
      "Sie trug den Glanz einer Frau, die zwischen Charme und Wahn längst nicht mehr an den Grenzen haltmachte.",
      "",
      "Der Schleier öffnete sich nur für dich."
    ].join("\n"),
    image: "fragment-easter-egg.png"
  };
}
