const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_KuUAvq29xfwj@ep-wispy-bird-ag8pel3r-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require');

async function migrate() {
    // Konuşmalar tablosu
    await sql`CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      user1_id INT REFERENCES users(id) ON DELETE CASCADE,
      user2_id INT REFERENCES users(id) ON DELETE CASCADE,
      last_message_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user1_id, user2_id)
    )`;
    console.log('✅ conversations tablosu oluşturuldu');

    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id)`;

    // Mesajlar tablosu
    await sql`CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id INT REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )`;
    console.log('✅ messages tablosu oluşturuldu');

    await sql`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`;
    console.log('✅ İndeksler oluşturuldu');

    console.log('\n🎉 Mesajlaşma sistemi migration tamamlandı!');
}

migrate().catch(e => console.error('Hata:', e.message));
