import { getExpiredMessages, markAsDeleted } from './database.js';

let deletionInterval = null;
let client = null;

export function startDeletionService(discordClient) {
  console.log('Starting deletion service...');
  client = discordClient;

  // Run cleanup every minute
  deletionInterval = setInterval(async () => {
    try {
      const expiredMessages = getExpiredMessages();

      if (expiredMessages.length > 0) {
        console.log(`Found ${expiredMessages.length} expired message(s) to delete`);

        for (const message of expiredMessages) {
          try {
            // Mark as deleted in database first
            markAsDeleted(message.message_id);
            console.log(`Marked database record ${message.message_id} as deleted`);

          } catch (error) {
            console.error(`Error processing message ${message.message_id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error in deletion service:', error);
    }
  }, 60000); // Run every 60 seconds (1 minute)
}

export function stopDeletionService() {
  if (deletionInterval) {
    clearInterval(deletionInterval);
    console.log('Deletion service stopped');
  }
}
