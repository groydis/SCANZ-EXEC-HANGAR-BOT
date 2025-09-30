# Executive Hangar Timer Discord Bot

A Discord bot that monitors the executive hangar timer at Xyxyll's site and sends timely notifications to a Discord channel.

## Features

- **30-minute warning system**: Automatically warns users when the hangar is about to open
- **Smart role mentions**: Mentions `@exec-pings` role only during active hours (11am-9pm AEST)
- **Quiet hours**: No role pings during 9pm-11am AEST (still posts warnings without mentions)
- **Slash commands**: `/hangar` and `/hanger` commands to query current timer status with 1-minute cooldown
- **Discord timestamps**: Times display in each user's local timezone automatically
- **Duplicate prevention**: Avoids multiple announcements for the same opening window
- **Health check endpoint**: Built-in HTTP health check for monitoring and deployment
- **Configurable thresholds**: Customizable warning time and polling frequency

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
- **Role ID** (optional): Right-click the `@exec-pings` role > "Copy Role ID"

### 3. Environment Configuration

1. Copy `env.example` to `.env`
2. Fill in your configuration:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CHANNEL_ID=your_channel_id_here
APPLICATION_ID=your_application_id_here
GUILD_ID=your_guild_id_here
EXEC_PINGS_ROLE_ID=your_role_id_here
TARGET_URL=https://exec.xyxyll.com/
THRESHOLD_MINUTES=30
POLL_SECONDS=60
PORT=3000
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

- `DISCORD_TOKEN`: Your Discord bot token (required)
- `DISCORD_CHANNEL_ID`: Channel ID for notifications (required)
- `APPLICATION_ID`: Discord application ID (required)
- `GUILD_ID`: Discord server/guild ID (required)
- `EXEC_PINGS_ROLE_ID`: Role ID to mention (optional, mentions only during 11am-9pm AEST)
- `TARGET_URL`: The website to monitor (default: https://exec.xyxyll.com/)
- `THRESHOLD_MINUTES`: Minutes before opening to send warning (default: 30)
- `POLL_SECONDS`: How often to check for updates (default: 60)
- `PORT`: Port for health check server (default: 3000, use 10000 for Render)

## Deployment

### Render (Recommended)

1. Fork/clone this repository to GitHub
2. Go to [Render.com](https://render.com) and sign up
3. Create a new **Web Service**
4. Connect your GitHub repository
5. Configure settings:
   - **Language**: Docker
   - **Build Context**: `.` (root directory)
   - **Dockerfile Path**: `Dockerfile`
   - **Health Check Path**: `/health`
6. Add environment variables (see Configuration section above)
   - **Important**: Set `PORT=10000` for Render
7. Deploy!

### Docker (Local or VPS)

```bash
docker build -t hangar-timer-bot .
docker run -d --env-file .env -p 3000:3000 hangar-timer-bot
```

### Manual Deployment

1. Set up environment variables on your hosting platform
2. Run `npm install && npx playwright install --with-deps`
3. Run `npm run register` to register slash commands (one time only)
4. Start the bot with `npm start`

## Commands

- `/hangar` - Show time until the next hangar opens (1-minute cooldown)
- `/hanger` - Alias of /hangar (typo-friendly)

## Discord Output Examples

### Warning Message (Active Hours: 11am-9pm AEST)
```
🚨 Executive Hangar Alert 🚨
@exec-pings The exec hangar is opening in 30 minutes at <t:1759189992:F>.
Once it opens, it will remain open until <t:1759193592:F>.
Source: https://exec.xyxyll.com/
```

### Warning Message (Quiet Hours: 9pm-11am AEST)
```
🚨 Executive Hangar Alert 🚨
The exec hangar is opening in 30 minutes at <t:1759189992:F>.
Once it opens, it will remain open until <t:1759193592:F>.
Source: https://exec.xyxyll.com/
```

### Slash Command Response
```
🕐 Hangar Status
⏰ Opens in: 2h 15m 30s
🕐 Opening time: <t:1759189992:F>
🕐 Closing time: <t:1759193592:F>
📅 Source: https://exec.xyxyll.com/
```

## Health Check

The bot includes a built-in health check endpoint at `/health` (or `/`) that returns:

```json
{
  "status": "ok",
  "bot": "SCANZ EXEC BOT#8213",
  "uptime": "2h 15m 30s",
  "lastSuccessfulFetch": "45s ago",
  "cachedEntries": 24,
  "timestamp": "2025-09-30T02:07:40.146Z"
}
```

This is useful for monitoring the bot's health and ensuring it's fetching schedules correctly.

## Requirements

- Node.js 16+
- Discord bot with appropriate permissions (Send Messages, Use Slash Commands)
- Internet access to exec.xyxyll.com

## About SCANZ

If you are interested in joining an AUS/NZ Star Citizen org or just looking to be part of a great SC community, check out SCANZ at: https://wescanz.com/

We are an inclusive community open to everyone.

## License

MIT