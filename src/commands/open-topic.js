import { SlashCommandBuilder } from 'discord.js';
import { TICKET_TOPICS } from '../services/ticket-topics.js';
import { setTopicAvailability } from '../services/panel-service.js';
export default {
  data: new SlashCommandBuilder().setName('opentopic').setDescription('Allow new tickets for a topic again.')
    .addStringOption((o) => o.setName('topic').setDescription('Topic to open').setRequired(true).addChoices(...TICKET_TOPICS.map(({id,name})=>({name,value:id})))),
  async execute(interaction, { db }) {
    const topicId = interaction.options.getString('topic', true);
    const topic = setTopicAvailability(db, interaction.guildId, topicId, true, interaction.user.id);
    await interaction.reply({ content: `New **${topic.name}** tickets are now open.`, ephemeral: true });
  },
};
