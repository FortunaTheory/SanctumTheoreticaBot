import { OracleAspect } from "./lore.js";

export const aspectDesign: Record<OracleAspect, {
  label: string;
  color: number;
  symbol: string;
  footer: string;
}> = {
  archive: {
    label: "Archiv",
    color: 0x9a7dcc,
    symbol: "◈",
    footer: "AKTE 00—∞ · SIGNAL VERIFIZIERT"
  },
  lucid: {
    label: "Lucid",
    color: 0x7650aa,
    symbol: "◇",
    footer: "AKTE L—∞ · MUSTER BESTÄTIGT"
  },
  enigma: {
    label: "Enigma",
    color: 0xc5b5e8,
    symbol: "⊘",
    footer: "AKTE E—∞ · KATALOGSTATUS: UNVOLLSTÄNDIG"
  }
};

export const profileDesign = {
  symbol: "⊘",
  fallbackColor: 0x6f5a94,
  footer: "Zugriff: Mod- und Admin-Team · Interne Akte"
};
