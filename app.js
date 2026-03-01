import 'dotenv/config';
import { Client, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import crypto from 'crypto';
import {
  initializeDatabase,
  storeBlackoutMessage,
  getBlackoutMessage,
  incrementAttemptCount,
  markAsRevealed,
  closeDatabase,
} from './database.js';
import { detectSensitiveInfo } from './sensitive-detector.js';
import { startDeletionService, stopDeletionService } from './deletion-service.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const messageCache = new Map();

function hashAnswer(answer) {
  return crypto.createHash('sha256').update(answer + 'salt123').digest('hex');
}

function compareAnswers(userAnswer, storedHash) {
  return hashAnswer(userAnswer) === storedHash;
}

client.once('ready', async () => {
  console.log(`✓ Bot logged in as ${client.user.tag}`);
  await initializeDatabase();
  console.log('✓ Database initialized');
  startDeletionService(client);
  console.log('✓ Deletion service started');
});

// Listen for messages
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  try {
    const detection = detectSensitiveInfo(message.content);
    if (!detection.detected) return;

    console.log('[MSG] Sensitive info detected');

    // Cache content
    const cacheId = Date.now().toString();
    messageCache.set(cacheId, {
      content: message.content,
      userId: message.author.id,
      channelId: message.channelId,
    });

    console.log('[MSG] Cached as:', cacheId);

    // Delete message
    await message.delete().catch(() => {});

    // Send button
    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`protect_${cacheId}`)
        .setLabel('🔒 Protect This')
        .setStyle(ButtonStyle.Success)
    );

    await message.reply({
      content: "It looks like you're about to send some sensitive information. Click to protect it!",
      components: [button],
    });
    console.log('[MSG] Button sent');
  } catch (error) {
    console.error('[MSG] Error:', error.message);
  }
});

// Handle interactions
client.on('interactionCreate', async (interaction) => {
  try {
    // Protect button clicked - show modal
    if (interaction.isButton() && interaction.customId.startsWith('protect_')) {
      const cacheId = interaction.customId.replace('protect_', '');
      console.log('[BTN] Button clicked, cacheId:', cacheId);

      if (!messageCache.has(cacheId)) {
        console.log('[BTN] Cache miss');
        await interaction.reply({ content: 'Session expired.', ephemeral: true });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId(`create_${cacheId}`)
        .setTitle('Protect Your Message');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('q')
            .setLabel('Security Question')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('a')
            .setLabel('Answer')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

      await interaction.showModal(modal);
      console.log('[BTN] Modal shown');
      return;
    }

    // Security question submitted - encrypt and send
    if (interaction.isModalSubmit() && interaction.customId.startsWith('create_')) {
      const cacheId = interaction.customId.replace('create_', '');
      const cached = messageCache.get(cacheId);

      if (!cached) {
        await interaction.reply({ content: 'Session expired.', ephemeral: true });
        return;
      }

      console.log('[MODAL] Creating protected message');

      await interaction.deferReply({ ephemeral: true });

      const question = interaction.fields.getTextInputValue('q');
      const answer = interaction.fields.getTextInputValue('a');

      // Encrypt
      const key = process.env.ENCRYPTION_KEY || 'default-key-change-this';
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.padEnd(32, '0').slice(0, 32)), iv);
      let enc = cipher.update(cached.content, 'utf8', 'hex');
      enc += cipher.final('hex');
      const encData = iv.toString('hex') + ':' + enc;

      const msgId = `pro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      storeBlackoutMessage(msgId, cached.channelId, cached.userId, encData, question, hashAnswer(answer));
      messageCache.delete(cacheId);

      console.log('[MODAL] Message encrypted and stored:', msgId);

      // Send protected message
      const embed = new EmbedBuilder()
        .setTitle('🔒 BLACKOUT TEXT')
        .setDescription(`**Q:** ${question}`)
        .setColor(0xFF0000)
        .setFooter({ text: 'Answer to reveal' });

      const reveal = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`reveal_${msgId}`)
          .setLabel('Reveal Content')
          .setStyle(ButtonStyle.Primary)
      );

      const channel = client.channels.cache.get(cached.channelId);
      if (channel) {
        await channel.send({ embeds: [embed], components: [reveal] });
        console.log('[MODAL] Protected message sent to channel');
      }

      await interaction.editReply({ content: '✅ Protected message sent!' });
      return;
    }

    // Reveal button clicked - show answer modal
    if (interaction.isButton() && interaction.customId.startsWith('reveal_')) {
      const msgId = interaction.customId.replace('reveal_', '');
      const msg = getBlackoutMessage(msgId);

      console.log('[REVEAL] Button clicked:', msgId);

      if (!msg) {
        await interaction.reply({ content: 'Message not found.', ephemeral: true });
        return;
      }

      if (msg.attempt_count >= 3) {
        await interaction.reply({ content: '❌ Too many attempts. Message locked.', ephemeral: true });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId(`answer_${msgId}`)
        .setTitle('Answer Question');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('ans')
            .setLabel(msg.question)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

      await interaction.showModal(modal);
      console.log('[REVEAL] Answer modal shown');
      return;
    }

    // Answer submitted
    if (interaction.isModalSubmit() && interaction.customId.startsWith('answer_')) {
      const msgId = interaction.customId.replace('answer_', '');
      const msg = getBlackoutMessage(msgId);

      console.log('[ANSWER] Answer submitted for:', msgId);

      if (!msg) {
        await interaction.reply({ content: 'Message not found.', ephemeral: true });
        return;
      }

      const ans = interaction.fields.getTextInputValue('ans');
      const correct = compareAnswers(ans, msg.answer_hash);

      if (correct) {
        console.log('[ANSWER] Correct answer!');
        markAsRevealed(msgId);

        const encData = msg.content;
        const [ivHex, enc] = encData.split(':');
        const key = process.env.ENCRYPTION_KEY || 'default-key-change-this';
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.padEnd(32, '0').slice(0, 32)), Buffer.from(ivHex, 'hex'));
        let dec = decipher.update(enc, 'hex', 'utf8');
        dec += decipher.final('utf8');

        await interaction.reply({
          content: `✅ Correct!\n\`\`\`\n${dec}\n\`\`\``,
          flags: 64  // Ephemeral
        });
      } else {
        console.log('[ANSWER] Wrong answer');
        incrementAttemptCount(msgId);
        const left = 3 - (msg.attempt_count + 1);
        await interaction.reply({
          content: `❌ Wrong answer. ${left} attempts left.`,
          flags: 64  // Ephemeral
        });
      }
      return;
    }
  } catch (error) {
    console.error('[ERROR]', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Error occurred.', flags: 64 }).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

process.on('SIGINT', () => {
  stopDeletionService();
  closeDatabase();
  client.destroy();
  process.exit(0);
});
