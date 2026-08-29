import { Client, Collection, Events, GatewayIntentBits, MessageFlags, REST, Routes } from "discord.js";
import { config } from "./config.js";
import { pingCommand } from "./commands/ping.js";
import { curatorCommand } from "./commands/curator.js";
import { oracleCommand } from "./commands/oracle.js";
import { fragmentCommand } from "./commands/fragment.js";
import { profileCommand } from "./commands/profile.js";
import { createWhisperCommand } from "./commands/whisper.js";
import { createWhisperAdminCommand } from "./commands/whisper-admin.js";
import { WhisperScheduler } from "./whisper-scheduler.js";
import { startActivityRotation } from "./activity.js";
import { closeContentDatabase } from "./content-database.js";
import { isTeamMember } from "./permissions.js";
import { getRuntimeConfig, refreshRuntimeConfig } from "./runtime-config.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const whisperScheduler = new WhisperScheduler(client);
const commands = [
  pingCommand,
  curatorCommand,
  oracleCommand,
  fragmentCommand,
  profileCommand,
  createWhisperCommand(),
  createWhisperAdminCommand(whisperScheduler)
];
const commandMap = new Collection<string, (interaction: import("discord.js").ChatInputCommandInteraction) => Promise<void>>(
  commands.map((command) => [command.data.name, command.execute])
);

const rest = new REST({ version: "10" }).setToken(config.token);
try {
  await refreshRuntimeConfig();
} catch (error) {
  console.error("Runtime-Konfiguration konnte vor der Command-Registrierung nicht geladen werden:", error);
}
const registrationGuildId = getRuntimeConfig().guildId;
const commandRoute = registrationGuildId
  ? Routes.applicationGuildCommands(config.clientId, registrationGuildId)
  : Routes.applicationCommands(config.clientId);

if (!registrationGuildId) {
  console.warn("DISCORD_GUILD_ID is not set; commands will be registered globally.");
}

try {
  await rest.put(commandRoute, { body: commands.map((command) => command.data.toJSON()) });
} catch (error) {
  if (error instanceof Error && "status" in error && error.status === 401) {
    throw new Error("Discord rejected DISCORD_TOKEN (401 Unauthorized). Regenerate the bot token and update .env.");
  }
  throw error;
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  console.log(`Registered ${commands.length} commands ${registrationGuildId ? "for the configured guild" : "globally"}.`);
  startActivityRotation(client);
  void whisperScheduler.load().catch((error) => console.error("Whisper-State konnte nicht geladen werden:", error));
  const refresh = async () => {
    try {
      if (await refreshRuntimeConfig()) {
        await whisperScheduler.applyRuntimeConfig();
        console.log("Runtime-Konfiguration aus der Datenbank aktualisiert.");
      }
    } catch (error) {
      console.error("Runtime-Konfiguration konnte nicht aktualisiert werden:", error);
    }
  };
  void refresh();
  setInterval(() => void refresh(), 30_000);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const execute = commandMap.get(interaction.commandName);
  if (!execute) return;

  if (interaction.commandName === "ping" && !isTeamMember(interaction)) {
    await interaction.reply({
      content: "Der Puls des Archivs bleibt dem Mod- und Admin-Team vorbehalten.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    await execute(interaction);
  } catch (error) {
    console.error(`Command ${interaction.commandName} failed:`, error);
    const reply: Parameters<typeof interaction.followUp>[0] = {
      content: "Beim Öffnen dieses Eintrags ist etwas schiefgegangen.",
      flags: MessageFlags.Ephemeral as number
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void closeContentDatabase()
      .catch((error) => console.error("Datenbankverbindung konnte nicht sauber geschlossen werden:", error))
      .finally(() => {
        client.destroy();
        process.exit(0);
      });
  });
}

await client.login(config.token);
