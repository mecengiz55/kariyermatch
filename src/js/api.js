// ── API Helper Module ──
const API_BASE = '/.netlify/functions';

function getToken() {
    return localStorage.getItem('km_token');
}

function setToken(token) {
    localStorage.setItem('km_token', token);
}

function removeToken() {
    localStorage.removeItem('km_token');
}

function getUser() {
    const data = localStorage.getItem('km_user');
    return data ? JSON.parse(data) : null;
}

function setUser(user) {
    localStorage.setItem('km_user', JSON.stringify(user));
}

function removeUser() {
    localStorage.removeItem('km_user');
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Bir hata oluştu');
        }

        return data;
    } catch (error) {
        if (error.message === 'Failed to fetch') {
            throw new Error('Sunucu ile bağlantı kurulamadı');
        }
        throw error;
    }
}

// ── PDF Upload Helper ──
async function uploadFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('Dosya seçilmedi'));
        if (file.type !== 'application/pdf') return reject(new Error('Sadece PDF dosyaları kabul edilir'));
        if (file.size > 5 * 1024 * 1024) return reject(new Error('Dosya boyutu 5MB\'dan büyük olamaz'));

        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result.split(',')[1]; // data:...;base64, kısmını kaldır
            try {
                const result = await apiRequest('/upload', {
                    method: 'POST',
                    body: JSON.stringify({
                        fileData: base64,
                        fileName: file.name,
                        mimeType: file.type
                    })
                });
                resolve(result);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Dosya okunamadı'));
        reader.readAsDataURL(file);
    });
}

// Auth API
export const authAPI = {
    register: (data) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => apiRequest('/auth/me'),
};

// Students API
export const studentsAPI = {
    getProfile: () => apiRequest('/students/profile'),
    getStudent: (id) => apiRequest(`/students/${id}`),
    updateProfile: (data) => apiRequest('/students/profile', { method: 'PUT', body: JSON.stringify(data) }),
    // Skills
    addSkill: (data) => apiRequest('/students/skills', { method: 'POST', body: JSON.stringify(data) }),
    removeSkill: (id) => apiRequest(`/students/skills/${id}`, { method: 'DELETE' }),
    // Languages
    addLanguage: (data) => apiRequest('/students/languages', { method: 'POST', body: JSON.stringify(data) }),
    removeLanguage: (id) => apiRequest(`/students/languages/${id}`, { method: 'DELETE' }),
    // References
    addReference: (data) => apiRequest('/students/references', { method: 'POST', body: JSON.stringify(data) }),
    removeReference: (id) => apiRequest(`/students/references/${id}`, { method: 'DELETE' }),
};

// Employers API
export const employersAPI = {
    getProfile: () => apiRequest('/employers/profile'),
    getEmployer: (id) => apiRequest(`/employers/${id}`),
    updateProfile: (data) => apiRequest('/employers/profile', { method: 'PUT', body: JSON.stringify(data) }),
};

// Jobs API
export const jobsAPI = {
    list: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/jobs${query ? '?' + query : ''}`);
    },
    get: (id) => apiRequest(`/jobs/${id}`),
    create: (data) => apiRequest('/jobs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiRequest(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiRequest(`/jobs/${id}`, { method: 'DELETE' }),
    my: () => apiRequest('/jobs/my'),
};

// Match API
export const matchAPI = {
    getMatchedJobs: () => apiRequest('/match/jobs'),
    getCandidates: (jobId) => apiRequest(`/match/candidates/${jobId}`),
};

// Applications API
export const applicationsAPI = {
    apply: (data) => apiRequest('/applications', { method: 'POST', body: JSON.stringify(data) }),
    myApplications: () => apiRequest('/applications/my'),
    jobApplications: (jobId) => apiRequest(`/applications/job/${jobId}`),
    updateStatus: (id, status) => apiRequest(`/applications/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
};

// Admin API
export const adminAPI = {
    stats: () => apiRequest('/admin/stats'),
    users: () => apiRequest('/admin/users'),
    deleteUser: (id) => apiRequest(`/admin/users/${id}`, { method: 'DELETE' }),
    updateUserRole: (id, role) => apiRequest(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
    jobs: () => apiRequest('/admin/jobs'),
    createJob: (data) => apiRequest('/admin/jobs', { method: 'POST', body: JSON.stringify(data) }),
    editJob: (id, data) => apiRequest(`/admin/jobs/${id}/edit`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteJob: (id) => apiRequest(`/admin/jobs/${id}`, { method: 'DELETE' }),
    toggleJob: (id) => apiRequest(`/admin/jobs/${id}/toggle`, { method: 'PUT' }),
    applications: () => apiRequest('/admin/applications'),
    getSettings: () => apiRequest('/admin/settings'),
    updateSettings: (settings) => apiRequest('/admin/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
};

// Notifications API
export const notificationsAPI = {
    list: () => apiRequest('/notifications'),
    unreadCount: () => apiRequest('/notifications/unread-count'),
    markRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () => apiRequest('/notifications/read-all', { method: 'PUT' }),
    delete: (id) => apiRequest(`/notifications/${id}`, { method: 'DELETE' }),
};

// Messages API
export const messagesAPI = {
    conversations: () => apiRequest('/messages/conversations'),
    getMessages: (convId) => apiRequest(`/messages/conversations/${convId}`),
    startConversation: (receiverId) => apiRequest('/messages/conversations', { method: 'POST', body: JSON.stringify({ receiverId }) }),
    send: (conversationId, content) => apiRequest('/messages/send', { method: 'POST', body: JSON.stringify({ conversationId, content }) }),
    unreadCount: () => apiRequest('/messages/unread-count'),
    markRead: (convId) => apiRequest(`/messages/conversations/${convId}/read`, { method: 'PUT' }),
};

// Search API
export const searchAPI = {
    searchCandidates: (filters) => apiRequest('/search/candidates', { method: 'POST', body: JSON.stringify(filters) }),
};

export { getToken, setToken, removeToken, getUser, setUser, removeUser, uploadFile };
