import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits } from 'discord.js';
export default {
  data: new SlashCommandBuilder().setName('setuppanel').setDescription('Create a private ticket panel draft (does not post it to a channel).').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, { db }) {
    const modal = new ModalBuilder().setCustomId('panel:create').setTitle('Set up ticket panel');
    const name = new TextInputBuilder().setCustomId('name').setLabel('Panel name').setStyle(TextInputStyle.Short).setMaxLength(80).setRequired(true);
    const description = new TextInputBuilder().setCustomId('description').setLabel('Panel description').setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(false);
    const roles = new TextInputBuilder().setCustomId('staffRoles').setLabel('Staff role IDs, comma separated').setStyle(TextInputStyle.Short).setRequired(false);
    modal.addComponents(new ActionRowBuilder().addComponents(name), new ActionRowBuilder().addComponents(description), new ActionRowBuilder().addComponents(roles));
    await interaction.showModal(modal);
  },
};
