import { SlashCommandBuilder } from 'discord.js';
import { isOwner, revokeAdminRole } from '../services/authorization.js';

export default {
  data: new SlashCommandBuilder()
    .setName('revokerole')
    .setDescription('Remove a role from ticket administration access (owner only).')
    .addRoleOption((option) => option.setName('role').setDescription('Role to remove').setRequired(true)),
  async execute(interaction, { db }) {
    if (!isOwner(interaction.user.id)) return interaction.reply({ content: 'Only the bot owner can remove authorized roles.', ephemeral: true });
    const role = interaction.options.getRole('role', true);
    const removed = revokeAdminRole(db, interaction.guildId, role.id);
    await interaction.reply({ content: removed ? `Role ${role} no longer has ticket administration access in this server.` : 'That role was not authorized.', ephemeral: true, allowedMentions: { roles: [] } });
  },
};
