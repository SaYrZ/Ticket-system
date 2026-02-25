# Discord Ticket System

A advanced Discord ticket bot system with panel, ticket management, transcripts, ratings, and comprehensive logging.

## Features

- **Ticket Panel**: Beautiful dropdown-based ticket creation system
- **Ticket Categories**: Support, General, Billing, Report
- **User Limits**: Configurable max tickets per user
- **Ticket Counter**: Automatic ticket numbering
- **Claim System**: Staff can claim tickets
- **Close System**: Secure ticket closure with confirmation
- **Transcripts**: Full transcript sent to user DM and log channel
- **Rating System**: 1-5 star rating with edit capability
- **Comprehensive Logging**: All ticket actions logged
- **Discord Components v2**: Buttons, Select Menus, Embeds with images

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure the `.env` file:
```env
BOT_TOKEN=your_bot_token_here

# Ticket System Configuration
MAX_TICKETS_PER_USER=3
TICKET_CATEGORY_ID=123456789012345678
TICKET_LOG_CHANNEL_ID=123456789012345678
SUPPORT_ROLE_ID=123456789012345678
ADMIN_ROLE_ID=123456789012345678

# Panel Configuration
PANEL_CHANNEL_ID=123456789012345678

# Transcript Configuration
TRANSCRIPT_DM_ENABLED=true

# Rating Configuration
RATING_ENABLED=true

# Logging Configuration
LOG_ALL_MESSAGES=true
LOG_TICKET_CREATION=true
LOG_TICKET_CLOSE=true
LOG_TICKET_CLAIM=true
LOG_TICKET_RATING=true
```

## Setup

1. Create a Discord bot at https://discord.com/developers/applications
2. Enable the following Privileged Gateway Intents:
   - Guilds
   - Guild Messages
   - Message Content
3. Copy the bot token to `.env`
4. Create the required roles and channels in Discord
5. Run the bot:
```bash
npm start
```

## Commands

### User Commands
- `/ticket create [category]` - Create a new ticket
- `/ticket close` - Close your ticket
- `/ticket info` - View your ticket info
- `/ping` - Check bot ping

### Admin Commands
- `/setup [channel]` - Set up the ticket panel
- `/tickets stats` - View ticket statistics
- `/tickets list` - List all open tickets
- `/tickets info [ticketid]` - Get info about a ticket
- `/tickets ratings` - View all ratings

## Ticket Panel

The ticket panel includes:
- Dropdown menu to select ticket category
- Button to create ticket
- Support for multiple categories:
  - Support: Technical issues
  - General: General inquiries
  - Billing: Payment questions
  - Report: Report issues

## Rating System

After a ticket is closed (that was claimed by staff), users receive a rating prompt in DM:
- 1-5 star rating
- Can edit rating once
- Ratings are logged in the log channel
- Staff performance tracked

## Transcript System

When a ticket is closed:
- Full transcript saved to log channel
- Transcript sent to user's DM
- Includes all messages, timestamps, and attachments

## File Structure

```
ticket-system/
├── .env                 # Environment variables
├── .env.example         # Example configuration
├── package.json         # Dependencies
├── src/
│   ├── index.js         # Main entry point
│   ├── events/
│   │   ├── ready.js         # Bot ready event
│   │   ├── interactionCreate.js  # Button/command handling
│   │   └── messageCreate.js      # Message logging
│   └── commands/
│       ├── admin/
│       │   ├── setup.js     # Setup command
│       │   └── ticketstats.js  # Stats command
│       └── user/
│           ├── ticket.js   # Ticket command
│           └── ping.js     # Ping command
└── data/                 # Data storage (auto-created)
    ├── tickets.json
    ├── ratings.json
    └── users.json
```

## Permissions Required

The bot needs:
- Manage Channels
- Manage Messages
- Send Messages
- Read Message History
- View Channels

## Support

For issues or questions, please create an issue on the GitHub repository.
