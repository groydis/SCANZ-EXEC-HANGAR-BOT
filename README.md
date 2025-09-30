# Executive Hangar Timer Discord Bot

A Discord bot that monitors the executive hangar timer at Xyxyll's site and sends timely notifications to a Discord channel.

## Features

- **30-minute warning system**: Automatically warns users when the hangar is about to open
- **Slash commands**: `/hangar` and `/hanger` commands to query current timer status
- **Duplicate prevention**: Avoids multiple announcements for the same opening window
- **Configurable thresholds**: Customizable warning time and polling frequency
- **Discord timestamp formatting**: Times display in each user's local timezone

## Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token
5. Go to "OAuth2" > "URL Generator"
6. Select "bot" and "applications.commands" scopes
7. Select necessary permissions (Send Messages, Use Slash Commands)
8. Copy the generated URL and invite the bot to your server

### 2. Get Required IDs

- **Application ID**: Found in the "General Information" section
- **Guild ID**: Right-click your server name > "Copy Server ID" (enable Developer Mode first)
- **Channel ID**: Right-click the target channel > "Copy Channel ID"

### 3. Environment Configuration

1. Copy `env.example` to `.env`
2. Fill in your configuration:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CHANNEL_ID=your_channel_id_here
APPLICATION_ID=your_application_id_here
GUILD_ID=your_guild_id_here
TARGET_URL=https://exec.xyxyll.com/
THRESHOLD_MINUTES=30
POLL_SECONDS=60
```

### 4. Installation

```bash
npm install
```

### 5. Register Slash Commands

```bash
npm run register
```

### 6. Start the Bot

```bash
npm start
```

## Configuration

- `THRESHOLD_MINUTES`: Minutes before opening to send warning (default: 30)
- `POLL_SECONDS`: How often to check for updates (default: 60)
- `TARGET_URL`: The website to monitor (default: https://exec.xyxyll.com/)

## Deployment

### Docker

```bash
docker build -t hangar-timer-bot .
docker run -d --env-file .env hangar-timer-bot
```

### Manual Deployment

1. Set up environment variables on your hosting platform
2. Run `npm run register` to register slash commands
3. Start the bot with `npm start`

## Commands

- `/hangar` - Show time until the next hangar opens
- `/hanger` - Alias of /hangar (typo-friendly)

## Discord Output Examples

### Warning Message
```
🚨 Executive Hangar Alert 🚨
The exec hangar is opening in 30 minutes at <t:1759189992:F>.
Once it opens, it will remain open until <t:1759193592:F>.
Source: https://exec.xyxyll.com/
```

### Slash Command Response
```
🕐 **Hangar Status**
⏰ Opens in: **2h 15m 30s**
🕐 Opening time: <t:1759189992:F>
🕐 Closing time: <t:1759193592:F>
📅 Source: https://exec.xyxyll.com/
```

## Requirements

- Node.js 16+
- Discord bot with appropriate permissions
- Internet access to exec.xyxyll.com

## License

MIT