export const TICKET_TOPICS = [
  { id: 'general_support', name: 'General Support', description: 'Get help with a general issue.', aiOpinion: false, aiDetector: false, fields: [{ label: 'Give us a few details', required: true, minLength: 1, maxLength: 1000, style: 'paragraph' }] },
  { id: 'business_inquiries', name: 'Business Inquiries', description: 'Contact us about business opportunities.', aiOpinion: false, aiDetector: false, fields: [{ label: 'Give us a few details', required: true, minLength: 1, maxLength: 1000, style: 'paragraph' }] },
  { id: 'appeals', name: 'Appeals', description: 'Appeal a moderation decision.', aiOpinion: false, aiDetector: false, fields: [{ label: 'Give us a few details', required: true, minLength: 1, maxLength: 1000, style: 'paragraph' }] },
  { id: 'super_suggestions', name: 'Super Suggestions', description: 'Share a suggestion with the team.', aiOpinion: false, aiDetector: true, fields: [{ label: 'Give us a few details', required: true, minLength: 1, maxLength: 1000, style: 'paragraph' }] },
  { id: 'development_application', name: 'Development Team Application', description: 'Apply to join the development team.', aiOpinion: true, aiDetector: true, application: true, fields: [
    { label: 'CV / application (part 1, max 4000)', required: true, minLength: 1, maxLength: 4000, style: 'paragraph' },
    { label: 'CV / application (part 2, max 1000)', required: false, minLength: 0, maxLength: 1000, style: 'paragraph' },
  ] },
  { id: 'moderation_application', name: 'Discord Moderation Team Application', description: 'Apply to join the Discord moderation team.', aiOpinion: true, aiDetector: true, application: true, fields: [
    { label: 'CV / application (part 1, max 4000)', required: true, minLength: 1, maxLength: 4000, style: 'paragraph' },
    { label: 'CV / application (part 2, max 1000)', required: false, minLength: 0, maxLength: 1000, style: 'paragraph' },
  ] },
  { id: 'other', name: 'Other', description: 'Anything that does not fit another topic.', aiOpinion: false, aiDetector: false, fields: [{ label: 'Give us a few details', required: true, minLength: 1, maxLength: 1000, style: 'paragraph' }] },
];

export const TOPIC_CHOICES = TICKET_TOPICS.map(({ id, name }) => ({ name, value: id }));
export const APPLICATION_TOPIC_IDS = new Set(TICKET_TOPICS.filter((topic) => topic.application).map((topic) => topic.id));
