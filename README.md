# Aszi Friend

A Discord ticket bot built with Node.js 22, discord.js 14, and Node's built-in SQLite module. SQLite uses no native addon, which works with FadeHost's Node 22 runtime.

## Start

1. Set `DISCORD_TOKEN` in FadeHost's environment settings.
2. Start with `npm start`.
3. Invite the bot with the `bot` and `applications.commands` scopes. It needs permissions to view channels, send messages, create channels, manage channel permissions, and manage private threads.
4. Use `/sentpanel` in the channel where the panel should appear.

The bot synchronizes both global and guild slash commands when it starts, replacing old command lists with the current commands. Guild commands are available immediately. `DISCORD_TOKEN` is the only required environment variable. Never commit a token or `.env` file.

## Ticket panel

`/sentpanel` posts a panel message with the FAQ and rules reminder and a **🎫 Create Ticket** button. The FAQ link is `<#1574181136026964180>`. No panel is posted until an authorized person invokes the command.

On button click, the user chooses one of these topics, a supported language, and a priority:

- General Support
- Business Inquiries
- Appeals
- Super Suggestions
- Development Team Application
- Discord Moderation Team Application
- Other

Each ticket is created as a separate private text channel without a category. The user sees the form configured for the selected topic. Non-application forms ask for “Give us a few details” (1–1,000 characters). Applications ask for a CV/application up to 5,000 characters. Discord limits each modal text box to 4,000 characters, so the application form uses a 4,000-character field plus an optional 1,000-character field.

The ticket includes a randomly selected reassurance message (30 variants) explaining that tickets are checked regularly 24/7 and that busy periods may take longer. It also includes Close, Claim, and Change Priority controls. The five priorities are Turtle 🐢, Low 🟢, Standard ⚪, High 🔴, and World-collapsing ☄️. Ask for AI Opinion is shown only on application tickets. Mod Chat can be disabled for the panel.

## Commands

- `/sentpanel` posts the panel in the current channel and can update its settings.
- `/closetopic topic:<topic>` stops new tickets for that topic.
- `/opentopic topic:<topic>` allows new tickets for that topic again.
- `/addlanguage language:<language>` enables English, Polish, German, Spanish, or French for ticket forms without posting another panel.
- `/removelanguage language:<language>` disables a language without posting another panel. At least one language must remain enabled.
- `/grantrole role:<role>` gives a role access to ticket administration commands (bot owner only).
- `/revokerole role:<role>` removes that access (bot owner only).

`/sentpanel` options:

- `title`, `description`: customize the panel message.
- `staff_role_ids`: comma-separated role IDs allowed to view tickets.
- `mention_role_ids`: comma-separated role IDs pinged when a ticket opens.
- `mod_chat_role_ids`: comma-separated role IDs added to the private Mod Chat.
- `languages`: enabled language codes, such as `en,pl,de,es,fr`.
- `topic_languages`: optional topic-specific language sets, for example `general_support=en,pl;appeals=en`. Each language must also be enabled in `languages`.
- `mod_chat`: enable or disable the Mod Chat control.
- `detector_suggestions`, `detector_dev_app`, `detector_mod_app`: enable/disable the text-pattern detector on the selected topic. These can also be set when rerunning `/sentpanel`.

The panel defaults to English and enables English, Polish, German, Spanish, and French. Language availability can be limited globally or per topic. Topic open/closed state is saved in SQLite and survives restarts. The FAQ and rules reminder remains in the panel even when you customize its title or description.

## Review limits

The detector is a local rule-based writing-pattern indicator. Scores display as localized percentages with at most one decimal place. A combined 7-point bonus is applied only when no obvious spelling/repeated-word flags are found and the text also has a polished style and a standard introduction; this is a limited heuristic, not a full spellchecker. It does not call an external AI service, cannot determine who wrote a text, and does not output an AI probability. It runs only on Super Suggestions and application topics, and can be disabled per topic. The owner-supplied junior developer CV calibration example is stored in `docs/ai-review-reference-example.md`; the analyzer uses its broad patterns rather than exact-text matching. Text shorter than 30 words is marked insufficient. The semicircle visual represents the pattern index, not a probability. The application completeness score is also a simple heuristic. Use these results only as review aids, never as proof or the sole basis for a decision.

## Command access

Bot owner: Discord user ID `1191814686644117537`. The owner can use all ticket administration commands and is the only user who can run `/grantrole` and `/revokerole`. Role grants apply only in the current server and are stored in SQLite. Ticket staff roles do not automatically gain command access.

## Development

- `npm run check` checks JavaScript syntax.
- `npm run deploy:commands` manually registers commands globally.
- Ticket data is stored in `data/` by default and is ignored by Git.
