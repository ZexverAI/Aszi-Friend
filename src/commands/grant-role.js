import { SlashCommandBuilder } from 'discord.js';
import { grantAdminRole, isOwner } from '../services/authorization.js';

export default {
  data: new SlashCommandBuilder()
    .setName('grantrole')
    .setDescription('Allow a role to use ticket administration commands (owner only).')
    .addRoleOption((option) => option.setName('role').setDescription('Role to authorize').setRequired(true)),
  async execute(interaction, { db }) {
    if (!isOwner(interaction.user.id)) return interaction.reply({ content: 'Only the bot owner can authorize roles.', ephemeral: true });
    const role = interaction.options.getRole('role', true);
    if (role.managed) return interaction.reply({ content: 'Managed integration roles cannot be authorized.', ephemeral: true });
    grantAdminRole(db, interaction.guildId, role.id, interaction.user.id);
    await interaction.reply({ content: `Role ${role} can now use the ticket administration commands in this server.`, ephemeral: true, allowedMentions: { roles: [] } });
  },
};
