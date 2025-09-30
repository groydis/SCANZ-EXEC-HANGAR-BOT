import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';
import { chromium } from '@playwright/test';

const { 
  DISCORD_TOKEN, 
  DISCORD_CHANNEL_ID, 
  TARGET_URL, 
  THRESHOLD_MINUTES = 30, 
  POLL_SECONDS = 60,
  EXEC_PINGS_ROLE_ID
} = process.env;

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds], 
  partials: [Partials.Channel] 
});

// State tracking
let lastAnnouncedOpen = null;
let lastFetchTime = 0;
let cachedSchedule = null;
const cooldowns = new Map();

// Parse local date assuming Australia/Brisbane timezone
function parseLocalDate(dateStr) {
  // Handle format like "9/30/2025, 10:50:40 AM"
  if (dateStr.includes(',')) {
    const [datePart, timePart] = dateStr.split(', ');
    const [month, day, year] = datePart.split('/').map(Number);
    const [time, period] = timePart.split(' ');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }
    
    return new Date(year, month - 1, day, hour24, minutes, seconds);
  }
  
  // Handle format like "10:50:40 AM" (fallback)
  const [time, period] = dateStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let hour24 = hours;
  
  if (period === 'PM' && hours !== 12) {
    hour24 += 12;
  } else if (period === 'AM' && hours === 12) {
    hour24 = 0;
  }
  
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour24, minutes);
  
  // If the time has passed today, assume it's for tomorrow
  if (date <= now) {
    date.setDate(date.getDate() + 1);
  }
  
  return date;
}

// Fetch schedule from the website
async function fetchSchedule() {
  const now = Date.now();
  
  // Use cached data if less than 1 minute old
  if (cachedSchedule && (now - lastFetchTime) < 60000) {
    return cachedSchedule;
  }
  
  console.log('Fetching schedule from', TARGET_URL);
  
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    
    // Wait for the schedule table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Extract schedule data
    const schedule = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (!table) return [];
      
      const rows = Array.from(table.querySelectorAll('tr'));
      const schedule = [];
      
      for (let i = 1; i < rows.length; i++) { // Skip header row
        const cells = rows[i].querySelectorAll('td');
        if (cells.length >= 3) {
          const cycle = cells[0].textContent.trim();
          const status = cells[1].textContent.trim();
          const timeStr = cells[2].textContent.trim();
          
          if (cycle && status && timeStr) {
            schedule.push({
              cycle,
              status,
              timeStr
            });
          }
        }
      }
      
      return schedule;
    });
    
    await browser.close();
    
    // Parse the schedule into proper date objects
    const parsedSchedule = schedule.map(item => ({
      ...item,
      start: parseLocalDate(item.timeStr)
    }));
    
    cachedSchedule = parsedSchedule;
    lastFetchTime = now;
    
    console.log('Schedule fetched successfully:', parsedSchedule.length, 'entries');
    return parsedSchedule;
    
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return cachedSchedule || [];
  }
}

// Find the next opening in the schedule
function findNextOpen(schedule) {
  const now = new Date();
  
  for (const item of schedule) {
    if (item.status.toLowerCase() === 'online' && item.start > now) {
      // Find the corresponding closing time
      const closingItem = schedule.find(s => 
        s.status.toLowerCase() === 'offline' && 
        s.start > item.start
      );
      
      return {
        start: item.start,
        end: closingItem ? closingItem.start : null
      };
    }
  }
  
  return null;
}

// Post warning message to Discord
async function postOpenWarning(nextOpen) {
  try {
    const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
    if (!channel) {
      console.error('Channel not found:', DISCORD_CHANNEL_ID);
      return;
    }
    
    const startTimestamp = Math.floor(nextOpen.start.getTime() / 1000);
    const endTimestamp = nextOpen.end ? Math.floor(nextOpen.end.getTime() / 1000) : null;
    
    const roleMention = EXEC_PINGS_ROLE_ID ? `<@&${EXEC_PINGS_ROLE_ID}>` : '@exec-pings';
    
    let message = `🚨 Executive Hangar Alert 🚨
${roleMention} The exec hangar is opening in ${THRESHOLD_MINUTES} minutes at <t:${startTimestamp}:F>.
Once it opens, it will remain open until <t:${endTimestamp}:F>.
Source: ${TARGET_URL}`;
    
    if (!endTimestamp) {
      message = `🚨 Executive Hangar Alert 🚨
${roleMention} The exec hangar is opening in ${THRESHOLD_MINUTES} minutes at <t:${startTimestamp}:F>.
Source: ${TARGET_URL}`;
    }
    
    await channel.send(message);
    console.log('Warning posted for opening at', nextOpen.start.toISOString());
    
  } catch (error) {
    console.error('Error posting warning:', error);
  }
}

// Handle slash commands
async function handleSlashCommand(interaction) {
  const userId = interaction.user.id;
  const now = Date.now();
  
  // Check cooldown
  if (cooldowns.has(userId) && (now - cooldowns.get(userId)) < 60000) {
    const remaining = Math.ceil((60000 - (now - cooldowns.get(userId))) / 1000);
    await interaction.reply({ 
      content: `Please wait ${remaining} seconds before using this command again.`, 
      flags: 64 // EPHEMERAL flag
    });
    return;
  }
  
  cooldowns.set(userId, now);
  
  // Acknowledge the interaction immediately to prevent timeout
  await interaction.deferReply();
  
  try {
    const schedule = await fetchSchedule();
    const nextOpen = findNextOpen(schedule);
    
    if (!nextOpen) {
      await interaction.editReply('No upcoming hangar openings found in the schedule.');
      return;
    }
    
    const now = new Date();
    const timeUntilOpen = nextOpen.start.getTime() - now.getTime();
    
    if (timeUntilOpen <= 0) {
      await interaction.editReply('The hangar is currently open!');
      return;
    }
    
    const hours = Math.floor(timeUntilOpen / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilOpen % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeUntilOpen % (1000 * 60)) / 1000);
    
    const startTimestamp = Math.floor(nextOpen.start.getTime() / 1000);
    const endTimestamp = nextOpen.end ? Math.floor(nextOpen.end.getTime() / 1000) : null;
    
    let timeStr = '';
    if (hours > 0) timeStr += `${hours}h `;
    if (minutes > 0) timeStr += `${minutes}m `;
    timeStr += `${seconds}s`;
    
    let response = `🕐 **Hangar Status**
⏰ Opens in: **${timeStr}**
🕐 Opening time: <t:${startTimestamp}:F>
🕐 Closing time: <t:${endTimestamp}:F>
📅 Source: ${TARGET_URL}`;
    
    if (!endTimestamp) {
      response = `🕐 **Hangar Status**
⏰ Opens in: **${timeStr}**
🕐 Opening time: <t:${startTimestamp}:F>
📅 Source: ${TARGET_URL}`;
    }
    
    await interaction.editReply(response);
    
  } catch (error) {
    console.error('Error handling slash command:', error);
    try {
      await interaction.editReply('Sorry, there was an error fetching the hangar schedule.');
    } catch (replyError) {
      console.error('Error replying to interaction:', replyError);
    }
  }
}

// Main polling loop
async function checkForOpenings() {
  try {
    const schedule = await fetchSchedule();
    const nextOpen = findNextOpen(schedule);
    
    if (!nextOpen) {
      console.log('No upcoming openings found');
      return;
    }
    
    const now = new Date();
    const timeUntilOpen = nextOpen.start.getTime() - now.getTime();
    const thresholdMs = THRESHOLD_MINUTES * 60 * 1000;
    
    console.log(`Next opening in ${Math.floor(timeUntilOpen / 60000)} minutes`);
    
    // Check if we should warn and haven't already warned for this opening
    if (timeUntilOpen > 0 && 
        timeUntilOpen <= thresholdMs && 
        lastAnnouncedOpen !== nextOpen.start.getTime()) {
      
      await postOpenWarning(nextOpen);
      lastAnnouncedOpen = nextOpen.start.getTime();
    }
    
  } catch (error) {
    console.error('Error in polling loop:', error);
  }
}

// Event handlers
client.once(Events.ClientReady, () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  
  // Start polling
  setInterval(checkForOpenings, POLL_SECONDS * 1000);
  
  // Initial check
  checkForOpenings();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'hangar' || interaction.commandName === 'hanger') {
    await handleSlashCommand(interaction);
  }
});

// Error handling
client.on(Events.Error, error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down bot...');
  client.destroy();
  process.exit(0);
});

// Start the bot
client.login(DISCORD_TOKEN);