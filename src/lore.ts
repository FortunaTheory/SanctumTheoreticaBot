import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { queryContent, usesContentDatabase } from "./content-database.js";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readDataFile(fileName: string): unknown {
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), "data", fileName), "utf8"));
  } catch (error) {
    throw new Error(`Daten-Datei konnte nicht gelesen werden: ${fileName}`, { cause: error });
  }
}

function requiredText(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${path} muss ein nichtleerer Text sein.`);
  }
  return value;
}

function optionalImage(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${path} muss ein Dateiname sein.`);
  }
  return value;
}

function parseProphecies(value: unknown): readonly Prophecy[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("oracle.json muss mindestens eine Prophezeiung enthalten.");
  }

  return value.map((entry, index) => {
    if (!isRecord(entry) || (entry.aspect !== "archive" && entry.aspect !== "lucid" && entry.aspect !== "enigma")) {
      throw new Error(`oracle.json[${index}].aspect ist ungültig.`);
    }
    return {
      aspect: entry.aspect,
      text: requiredText(entry.text, `oracle.json[${index}].text`),
      image: optionalImage(entry.image, `oracle.json[${index}].image`)
    };
  });
}

function parseFragments(value: unknown): readonly FragmentEntry[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("fragments.json muss mindestens ein Fragment enthalten.");
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`fragments.json[${index}] ist ungültig.`);
    return {
      title: requiredText(entry.title, `fragments.json[${index}].title`),
      text: requiredText(entry.text, `fragments.json[${index}].text`),
      image: optionalImage(entry.image, `fragments.json[${index}].image`)
    };
  });
}

function parseProfileCard(value: unknown, path: string): ProfileCard {
  if (!isRecord(value)) throw new Error(`${path} ist ungültig.`);
  if (value.roleId !== undefined && typeof value.roleId !== "string") throw new Error(`${path}.roleId muss ein Text sein.`);
  if (value.priority !== undefined && (typeof value.priority !== "number" || !Number.isFinite(value.priority))) {
    throw new Error(`${path}.priority muss eine Zahl sein.`);
  }
  return {
    roleId: value.roleId,
    priority: value.priority,
    author: requiredText(value.author, `${path}.author`),
    title: requiredText(value.title, `${path}.title`),
    status: requiredText(value.status, `${path}.status`),
    note: requiredText(value.note, `${path}.note`),
    footer: requiredText(value.footer, `${path}.footer`),
    color: requiredText(value.color, `${path}.color`),
    image: optionalImage(value.image, `${path}.image`)
  };
}

function parseProfiles(value: unknown): ProfileData {
  if (!isRecord(value) || !Array.isArray(value.roles)) {
    throw new Error("profiles.json muss eine Standardkarte und Rollen enthalten.");
  }
  const roles = value.roles.map((card, index) => parseProfileCard(card, `profiles.json.roles[${index}]`));
  for (const card of roles) {
    if (card.roleId?.startsWith("replace_with_")) {
      console.warn(`Unerreichbare Platzhalter-Rolle in profiles.json: ${card.roleId}`);
    }
  }
  return { default: parseProfileCard(value.default, "profiles.json.default"), roles };
}

export const prophecies = parseProphecies(readDataFile("oracle.json"));
export const fragmentEntries = parseFragments(readDataFile("fragments.json"));
const profileData = parseProfiles(readDataFile("profiles.json"));

export async function getProphecy(requestedAspect?: OracleAspect): Promise<Prophecy> {
  if (!usesContentDatabase()) {
    const available = requestedAspect
      ? prophecies.filter((prophecy) => prophecy.aspect === requestedAspect)
      : prophecies;
    return choose(available);
  }

  const rows = await queryContent<Record<string, unknown>>(
    `SELECT aspect, text, image_key AS image
     FROM oracle_entries
     WHERE ($1::text IS NULL OR aspect = $1)
     ORDER BY random()
     LIMIT 1`,
    [requestedAspect ?? null]
  );
  if (!rows[0]) throw new Error("Die Datenbank enthält kein passendes Orakel.");
  return parseProphecies([rows[0]])[0]!;
}

export async function getFragment(): Promise<FragmentEntry> {
  if (!usesContentDatabase()) return choose(fragmentEntries);

  const rows = await queryContent<Record<string, unknown>>(
    "SELECT title, text, image_key AS image FROM fragment_entries ORDER BY random() LIMIT 1"
  );
  if (!rows[0]) throw new Error("Die Datenbank enthält kein Fragment.");
  return parseFragments([rows[0]])[0]!;
}

export async function getProfileCard(roleIds: readonly string[]): Promise<ProfileCard> {
  if (!usesContentDatabase()) return getJsonProfileCard(roleIds);

  const cards = await queryContent<Record<string, unknown>>(
    `SELECT role_id AS "roleId", priority, author, title, status, note, footer, color, image_key AS image
     FROM profile_cards
     WHERE role_id = ANY($1::text[])
     ORDER BY priority DESC`,
    [roleIds]
  );
  if (cards.length > 0) {
    const highestPriority = cards[0]?.priority;
    const variants = cards.filter((card) => card.priority === highestPriority);
    return parseProfileCard(choose(variants), "profile_cards");
  }

  const defaults = await queryContent<Record<string, unknown>>(
    `SELECT role_id AS "roleId", priority, author, title, status, note, footer, color, image_key AS image
     FROM profile_cards
     WHERE is_default = true
     LIMIT 1`
  );
  if (!defaults[0]) throw new Error("Die Datenbank enthält keine Standard-Profilkarte.");
  return parseProfileCard(defaults[0], "profile_cards.default");
}

function getJsonProfileCard(roleIds: readonly string[]): ProfileCard {
  const matchingCards = profileData.roles
    .filter((card) => card.roleId && roleIds.includes(card.roleId))
    .sort((first, second) => (second.priority ?? 0) - (first.priority ?? 0));
  const highestPriority = matchingCards[0]?.priority ?? -1;
  const variants = matchingCards.filter((card) => (card.priority ?? 0) === highestPriority);
  return variants[Math.floor(Math.random() * variants.length)] ?? profileData.default;
}

export function choose<T>(items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error("Eine zufällige Auswahl benötigt mindestens einen Eintrag.");
  }
  return items[Math.floor(Math.random() * items.length)];
}