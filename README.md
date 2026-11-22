# Aszi Friend

A modular Discord ticket bot foundation using Node.js 22.13+, discord.js 14, and Node's built-in SQLite module (`node:sqlite`), with no native SQLite addon to compile.

## Setup

1. Install Node.js 22 and run `npm install`.
2. Copy `.env.example` to `.env`; set `DISCORD_TOKEN`. Optionally set `DISCORD_GUILD_ID` for fast development registration.
3. In the Discord Developer Portal, enable the Server Members intent if you use private moderator chat.
4. Run `npm run deploy:commands` and then `npm start`.

Do not commit `.env` or bot tokens. The bot needs permission to create private text channels and threads.

## Panel workflow

- `/setuppanel` creates a private panel draft only; it does not post a message or create a channel.
- `/addtopic panel_id:<id>` adds a topic with up to five form fields. Example field JSON: `[{"label":"Describe the issue","required":true,"minLength":20,"maxLength":1000,"style":"paragraph"}]`.
- `/configurepanel panel_id:<id>` edits advanced JSON. Example: `{"languages":["en","pl"],"rolesMentionedOnOpen":["ROLE_ID"],"staffRoleIds":["ROLE_ID"],"modChatRoleIds":["ROLE_ID"],"aiDetector":true,"modChat":true,"defaultLanguage":"en","buttonLabel":"Create a ticket"}`. Topic-level `languages`, `aiDetector`, `modChat`, and `enabled` can override panel settings.
- `/listpanels` lists draft IDs. `/publishpanel` posts a panel only when an administrator explicitly invokes it and selects a channel. No panel has been published automatically.

Supported interface languages are English (default), Polish, German, Spanish, and French. Topics can limit their available languages. Each ticket is a separate text channel without a category. Opening a ticket pings only configured roles. The five priority levels are Turtle, Low, Standard (gray circle), High, and World-collapsing.

The ticket channel includes close, claim, per-field text-pattern review, private moderator chat, and priority controls. Private moderator chat uses a private thread and adds members matching configured role IDs (maximum 50). Discord modals allow at most five text inputs, so each topic accepts up to five custom fields. A panel supports at most 25 topics.

## Review limitations

No external AI detector or AI API is enabled. The built-in review provides a transparent rule-based text-pattern indicator and a separate basic completeness score; it does not establish AI authorship. Scores can be wrong and must not be used as proof or as the sole reason to reject an application. Short text is marked insufficient. The semicircle is a visual indicator, not a probability chart.

## Command access

The only built-in owner is Discord user ID `1191814686644117537`. The owner can use all ticket administration slash commands and is the only person who can run `/grantrole` or `/revokerole`. Use `/grantrole role:<role>` to allow a role to use panel administration commands in the current server; use `/revokerole` to remove that access. Grants are stored in SQLite separately for each server. Ticket staff roles configured on a panel do not automatically receive command administration access.

After updating, run `npm run deploy:commands` so Discord registers `/grantrole`, `/revokerole`, and the updated command access settings. `DISCORD_TOKEN` is the only required environment variable.

## Development

Run `npm run check` for syntax checks across all JavaScript files. SQLite data is stored under `data/` by default and is ignored by Git.
