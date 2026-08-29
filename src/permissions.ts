import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits } from "discord.js";
import { config } from "./config.js";

export function isTeamMember(interaction: ChatInputCommandInteraction): boolean {
  if (!interaction.inGuild() || !interaction.member) return false;
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;

  const roles = interaction.member.roles;
  return Array.isArray(roles)
    ? roles.some((roleId) => config.modRoleIds.includes(roleId))
    : roles.cache.some((role) => config.modRoleIds.includes(role.id));
}

export function isAuthorizedMember(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.Administrator)
    || member.roles.cache.some((role) => config.modRoleIds.includes(role.id));
}