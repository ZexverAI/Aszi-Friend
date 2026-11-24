import { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Publish a framed announcement in this channel.'),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Run this command in a server channel.', ephemeral: true });
    if (!interaction.channel?.isTextBased()) return interaction.reply({ content: 'This channel cannot receive announcements.', ephemeral: true });

    const modal = new ModalBuilder()
      .setCustomId('announce:' + interaction.channelId + ':' + interaction.user.id)
      .setTitle('Create an Announcement')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('announcement_title')
            .setLabel('Announcement title')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(256)
            .setRequired(true),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('announcement_description')
            .setLabel('Announcement description')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(4000)
            .setRequired(true),
        ),
      );
    return interaction.showModal(modal);
  },
};
