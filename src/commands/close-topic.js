import { SlashCommandBuilder } from 'discord.js';
import { TICKET_TOPICS } from '../services/ticket-topics.js';
import { setTopicAvailability } from '../services/panel-service.js';
export default {
  data: new SlashCommandBuilder().setName('closetopic').setDescription('Temporarily stop new tickets for a topic.')
    .addStringOption((o) => o.setName('topic').setDescription('Topic to close').setRequired(true).addChoices(...TICKET_TOPICS.map(({id,name})=>({name,value:id})))),
  async execute(interaction, { db }) {
    const topicId = interaction.options.getString('topic', true);
    const topic = setTopicAvailability(db, interaction.guildId, topicId, false, interaction.user.id);
    await interaction.reply({ content: `New **${topic.name}** tickets are now closed. Existing tickets are unchanged.`, ephemeral: true });
  },
};
