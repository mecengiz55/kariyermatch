// ── Messages Page ──
import { messagesAPI, getUser } from '../api.js';

let pollInterval = null;

export async function renderMessages(container) {
    const user = getUser();
    if (!user) {
        window.location.hash = '#/login';
        return;
    }

    container.innerHTML = `
    <div class="container" style="padding-top:var(--space-8);padding-bottom:var(--space-8);">
      <div class="messages-layout">
        <!-- Sol Panel: Konuşma Listesi -->
        <div class="conversations-panel" id="conversationsPanel">
          <div class="conversations-header">
            <h2>💬 Mesajlar</h2>
          </div>
          <div class="conversations-list" id="conversationsList">
            <div style="display:flex;justify-content:center;padding:3rem;"><div class="spinner"></div></div>
          </div>
        </div>

        <!-- Sağ Panel: Sohbet -->
        <div class="chat-panel" id="chatPanel">
          <div class="chat-empty-state">
            <span style="font-size:3rem;">💬</span>
            <h3>Bir konuşma seçin</h3>
            <p>Sol panelden bir konuşma seçerek mesajlaşmaya başlayın</p>
          </div>
        </div>
      </div>
    </div>
  `;

    await loadConversations();

    // Poll for new messages every 15 seconds
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(loadConversations, 15000);
}

async function loadConversations() {
    const listEl = document.getElementById('conversationsList');
    if (!listEl) {
        if (pollInterval) clearInterval(pollInterval);
        return;
    }

    try {
        const data = await messagesAPI.conversations();
        const conversations = data.conversations || [];

        if (conversations.length === 0) {
            listEl.innerHTML = `
        <div class="conv-empty">
          <span style="font-size:2rem;">📭</span>
          <p>Henüz mesajınız yok</p>
        </div>
      `;
            return;
        }

        const activeConvId = listEl.dataset.activeConv;

        listEl.innerHTML = conversations.map(c => `
      <div class="conversation-item ${c.id == activeConvId ? 'active' : ''} ${parseInt(c.unread_count) > 0 ? 'has-unread' : ''}" data-conv-id="${c.id}" data-other-name="${c.other_name || 'Kullanıcı'}" data-other-id="${c.other_user_id}">
        <div class="conv-avatar">${getAvatar(c.other_name)}</div>
        <div class="conv-info">
          <div class="conv-name-row">
            <span class="conv-name">${c.other_name || 'Kullanıcı'}</span>
            <span class="conv-time">${getTimeAgo(c.last_message_at)}</span>
          </div>
          <div class="conv-role">${c.other_role === 'student' ? '🎓 Öğrenci' : c.other_role === 'employer' ? '🏢 İşveren' : ''}</div>
          <div class="conv-preview">${c.last_message ? truncate(c.last_message, 50) : 'Henüz mesaj yok'}</div>
        </div>
        ${parseInt(c.unread_count) > 0 ? `<span class="conv-unread-badge">${c.unread_count}</span>` : ''}
      </div>
    `).join('');

        // Click event for each conversation
        listEl.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const convId = item.dataset.convId;
                const otherName = item.dataset.otherName;
                listEl.dataset.activeConv = convId;

                // Update active state
                listEl.querySelectorAll('.conversation-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                item.classList.remove('has-unread');
                const badge = item.querySelector('.conv-unread-badge');
                if (badge) badge.remove();

                loadChat(convId, otherName);

                // On mobile, show chat panel
                document.getElementById('chatPanel')?.classList.add('mobile-active');
            });
        });
    } catch (error) {
        listEl.innerHTML = `<div class="conv-empty"><p>⚠️ Yüklenemedi</p></div>`;
    }
}

async function loadChat(convId, otherName) {
    const chatPanel = document.getElementById('chatPanel');
    if (!chatPanel) return;

    const user = getUser();

    chatPanel.innerHTML = `
    <div class="chat-header">
      <button class="chat-back-btn" id="chatBackBtn">←</button>
      <div class="chat-header-avatar">${getAvatar(otherName)}</div>
      <div class="chat-header-info">
        <span class="chat-header-name">${otherName}</span>
      </div>
    </div>
    <div class="chat-messages" id="chatMessages">
      <div style="display:flex;justify-content:center;padding:3rem;"><div class="spinner"></div></div>
    </div>
    <div class="chat-input-area">
      <form class="chat-input-form" id="chatInputForm">
        <input type="text" id="chatInput" placeholder="Mesajınızı yazın..." autocomplete="off" required />
        <button type="submit" class="btn btn-primary btn-sm">Gönder</button>
      </form>
    </div>
  `;

    // Back button for mobile
    document.getElementById('chatBackBtn')?.addEventListener('click', () => {
        chatPanel.classList.remove('mobile-active');
    });

    // Load messages
    try {
        const data = await messagesAPI.getMessages(convId);
        const messages = data.messages || [];
        const chatMessages = document.getElementById('chatMessages');

        if (messages.length === 0) {
            chatMessages.innerHTML = `
        <div class="chat-empty-state" style="padding:2rem;">
          <p style="color:var(--text-muted);">Henüz mesaj yok. İlk mesajı gönderin!</p>
        </div>
      `;
        } else {
            chatMessages.innerHTML = messages.map(m => `
        <div class="chat-bubble ${m.sender_id === user.id ? 'sent' : 'received'}">
          <div class="chat-bubble-content">${escapeHtml(m.content)}</div>
          <div class="chat-bubble-time">${formatTime(m.created_at)}</div>
        </div>
      `).join('');

            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } catch (error) {
        document.getElementById('chatMessages').innerHTML = `<div class="chat-empty-state"><p>⚠️ Mesajlar yüklenemedi</p></div>`;
    }

    // Send message
    document.getElementById('chatInputForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const content = input.value.trim();
        if (!content) return;

        input.value = '';
        input.focus();

        // Optimistic UI: add message immediately
        const chatMessages = document.getElementById('chatMessages');
        const emptyState = chatMessages.querySelector('.chat-empty-state');
        if (emptyState) emptyState.remove();

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble sent';
        bubble.innerHTML = `
      <div class="chat-bubble-content">${escapeHtml(content)}</div>
      <div class="chat-bubble-time">Şimdi</div>
    `;
        chatMessages.appendChild(bubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            await messagesAPI.send(convId, content);
            // Refresh conversation list to update last message
            loadConversations();
        } catch (error) {
            bubble.classList.add('error');
            bubble.querySelector('.chat-bubble-time').textContent = '⚠️ Gönderilemedi';
        }
    });
}

// ── Helpers ──
function getAvatar(name) {
    if (!name) return '👤';
    return name.charAt(0).toUpperCase();
}

function truncate(str, len) {
    return str.length > len ? str.substring(0, len) + '...' : str;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function getTimeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Az önce';
    if (mins < 60) return `${mins}dk`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}sa`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}g`;
    return new Date(dateStr).toLocaleDateString('tr-TR');
}

// Cleanup on page leave
export function cleanupMessages() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}
