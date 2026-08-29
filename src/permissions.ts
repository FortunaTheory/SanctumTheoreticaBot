import { APIInteractionGuildMember, ChatInputCommandInteraction, GuildMember, PermissionFlagsBits } from "discord.js";
import { config } from "./config.js";

export function isTeamMember(interaction: ChatInputCommandInteraction): boolean {
  if (!interaction.inGuild() || !interaction.member) return false;
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;

  const roles = interaction.member.roles;
  return Array.isArray(roles)
    ? roles.some((roleId) => config.modRoleIds.includes(roleId))
    : roles.cache.some((role) => config.modRoleIds.includes(role.id));
}

export function isAuthorizedMember(member: GuildMember | APIInteractionGuildMember): boolean {
  const permissions = "permissions" in member ? member.permissions : undefined;
  const roles = "roles" in member ? member.roles : undefined;

  const hasAdministrator = typeof permissions === "string"
    ? (BigInt(permissions) & BigInt(PermissionFlagsBits.Administrator)) === BigInt(PermissionFlagsBits.Administrator)
    : permissions?.has(PermissionFlagsBits.Administrator) ?? false;

  if (hasAdministrator) return true;
  if (!roles) return false;

  if ("cache" in roles) {
    return roles.cache.some((role) => config.modRoleIds.includes(role.id));
  }

  return Array.isArray(roles)
    ? roles.some((roleId) => config.modRoleIds.includes(roleId))
    : false;
}