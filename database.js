import initSqlJs from 'sql.js';

let db = null;
let SQL = null;

// Initialize database
export async function initializeDatabase() {
  SQL = await initSqlJs();
  db = new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS blackout_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT UNIQUE NOT NULL,
      channel_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      question TEXT NOT NULL,
      answer_hash TEXT NOT NULL,
      attempt_count INTEGER DEFAULT 0,
      revealed_at INTEGER,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      is_deleted INTEGER DEFAULT 0
    )
  `);

  console.log('Database initialized');
}

// Store a new blackout message
export function storeBlackoutMessage(messageId, channelId, senderId, encryptedContent, question, answerHash) {
  const now = Date.now();
  const expiresAt = now + (15 * 60 * 1000); // 15 minutes from now

  try {
    db.run(
      `INSERT INTO blackout_messages
       (message_id, channel_id, sender_id, content, question, answer_hash, attempt_count, created_at, expires_at, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [messageId, channelId, senderId, encryptedContent, question, answerHash, 0, now, expiresAt, 0]
    );

    return messageId;
  } catch (error) {
    console.error('Error storing blackout message:', error);
    throw error;
  }
}

// Get a blackout message by ID
export function getBlackoutMessage(messageId) {
  try {
    const result = db.exec(
      `SELECT * FROM blackout_messages
       WHERE message_id = ? AND is_deleted = 0`,
      [messageId]
    );

    if (result.length === 0) {
      return null;
    }

    const columns = result[0].columns;
    const values = result[0].values[0];

    const message = {};
    columns.forEach((col, idx) => {
      message[col] = values[idx];
    });

    return message;
  } catch (error) {
    console.error('Error getting blackout message:', error);
    return null;
  }
}

// Increment attempt count for a message
export function incrementAttemptCount(messageId) {
  try {
    db.run(
      `UPDATE blackout_messages
       SET attempt_count = attempt_count + 1
       WHERE message_id = ?`,
      [messageId]
    );
  } catch (error) {
    console.error('Error incrementing attempt count:', error);
  }
}

// Mark message as revealed
export function markAsRevealed(messageId) {
  try {
    db.run(
      `UPDATE blackout_messages
       SET revealed_at = ?
       WHERE message_id = ?`,
      [Date.now(), messageId]
    );
  } catch (error) {
    console.error('Error marking message as revealed:', error);
  }
}

// Get all expired messages that haven't been deleted yet
export function getExpiredMessages() {
  try {
    const now = Date.now();
    const result = db.exec(
      `SELECT * FROM blackout_messages
       WHERE expires_at < ? AND is_deleted = 0`,
      [now]
    );

    if (result.length === 0) {
      return [];
    }

    const columns = result[0].columns;
    const messages = result[0].values.map(values => {
      const message = {};
      columns.forEach((col, idx) => {
        message[col] = values[idx];
      });
      return message;
    });

    return messages;
  } catch (error) {
    console.error('Error getting expired messages:', error);
    return [];
  }
}

// Mark a message as deleted
export function markAsDeleted(messageId) {
  try {
    db.run(
      `UPDATE blackout_messages
       SET is_deleted = 1
       WHERE message_id = ?`,
      [messageId]
    );
  } catch (error) {
    console.error('Error marking message as deleted:', error);
  }
}

// Close database connection
export function closeDatabase() {
  if (db) {
    db.close();
  }
}

export { db };
