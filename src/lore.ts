import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type OracleAspect = "archive" | "lucid" | "enigma";

export type Prophecy = {
  aspect: OracleAspect;
  text: string;
  image?: string;
};

export type FragmentEntry = {
  title: string;
  text: string;
  image?: string;
};

export type ProfileCard = {
  roleId?: string;
  priority?: number;
  author: string;
  title: string;
  status: string;
  note: string;
  footer: string;
  color: string;
  image?: string;
};

type ProfileData = {
  default: ProfileCard;
  roles: readonly ProfileCard[];
};

export const prophecies: readonly Prophecy[] = JSON.parse(
  readFileSync(resolve(process.cwd(), "data", "oracle.json"), "utf8")
);

export const fragmentEntries: readonly FragmentEntry[] = JSON.parse(
  readFileSync(resolve(process.cwd(), "data", "fragments.json"), "utf8")
);

const profileData: ProfileData = JSON.parse(
  readFileSync(resolve(process.cwd(), "data", "profiles.json"), "utf8")
);

export function getProfileCard(roleIds: readonly string[]): ProfileCard {
  const matchingCards = profileData.roles
    .filter((card) => card.roleId && roleIds.includes(card.roleId))
    .sort((first, second) => (second.priority ?? 0) - (first.priority ?? 0));
  const highestPriority = matchingCards[0]?.priority ?? -1;
  const variants = matchingCards.filter((card) => (card.priority ?? 0) === highestPriority);
  return variants[Math.floor(Math.random() * variants.length)] ?? profileData.default;
}

export function choose<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}