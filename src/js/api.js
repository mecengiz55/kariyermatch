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
    addSkill: (data) => apiRequest('/students/skills', { method: 'POST', body: JSON.stringify(data) }),
    removeSkill: (id) => apiRequest(`/students/skills/${id}`, { method: 'DELETE' }),
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

export { getToken, setToken, removeToken, getUser, setUser, removeUser };
