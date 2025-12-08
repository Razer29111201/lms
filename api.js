// ===== API SERVICE (UPDATED FOR EXPRESS BACKEND) =====

const API = {
    // Base API call function
    async call(endpoint, method = 'GET', data = null) {
        try {
            showLoading();

            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }

            const url = `${CONFIG.API_URL}${endpoint}`;
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            hideLoading();

            if (result.success !== false) {
                return result.data || result;
            } else {
                throw new Error(result.error || 'API Error');
            }
        } catch (error) {
            hideLoading();
            console.error('API Error:', error);
            throw error;
        }
    },

    // ===== AUTHENTICATION =====
    async login(email, password) {
        return await this.call('/auth/login', 'POST', { email, password });
    },

    async register(userData) {
        return await this.call('/auth/register', 'POST', userData);
    },

    async getUsers() {
        return await this.call('/users');
    },

    async getUser(id) {
        return await this.call(`/users/${id}`);
    },

    async updateUser(id, userData) {
        return await this.call(`/users/${id}`, 'PUT', userData);
    },

    async changePassword(userId, oldPassword, newPassword) {
        return await this.call('/auth/change-password', 'POST', {
            userId, oldPassword, newPassword
        });
    },

    // ===== CLASSES =====
    async getClasses() {
        return await this.call('/classes');
    },

    async getClass(id) {
        return await this.call(`/classes/${id}`);
    },

    async createClass(classData) {
        return await this.call('/classes', 'POST', classData);
    },

    async updateClass(id, classData) {
        return await this.call(`/classes/${id}`, 'PUT', classData);
    },

    async deleteClass(id) {
        return await this.call(`/classes/${id}`, 'DELETE');
    },

    // ===== SESSIONS =====
    async getSessions(classId) {
        return await this.call(`/sessions/${classId}`);
    },

    async updateSessions(classId, sessions) {
        return await this.call(`/sessions/${classId}`, 'PUT', { sessions });
    },

    // ===== STUDENTS =====
    async getStudents() {
        return await this.call('/students');
    },

    async getStudent(id) {
        return await this.call(`/students/${id}`);
    },

    async createStudent(studentData) {
        return await this.call('/students', 'POST', studentData);
    },

    async updateStudent(id, studentData) {
        return await this.call(`/students/${id}`, 'PUT', studentData);
    },

    async deleteStudent(id) {
        return await this.call(`/students/${id}`, 'DELETE');
    },

    // ===== TEACHERS =====
    async getTeachers() {
        return await this.call('/teachers');
    },

    async getTeacher(id) {
        return await this.call(`/teachers/${id}`);
    },

    async createTeacher(teacherData) {
        return await this.call('/teachers', 'POST', teacherData);
    },

    async updateTeacher(id, teacherData) {
        return await this.call(`/teachers/${id}`, 'PUT', teacherData);
    },

    async deleteTeacher(id) {
        return await this.call(`/teachers/${id}`, 'DELETE');
    },

    // ===== ATTENDANCE =====
    async getAttendance(classId, session) {
        return await this.call(`/attendance/${classId}/${session}`);
    },

    async saveAttendance(classId, session, records) {
        return await this.call('/attendance', 'POST', {
            classId, session, records
        });
    },

    async getClassAttendanceStats(classId) {
        return await this.call(`/attendance/class/${classId}/stats`);
    },

    async getStudentAttendanceStats(studentId, classId) {
        return await this.call(`/attendance/student/${studentId}/class/${classId}/stats`);
    },

    // ===== COMMENTS =====
    async getComments(classId) {
        return await this.call(`/comments/class/${classId}`);
    },

    async saveComments(classId, comments) {
        return await this.call('/comments', 'POST', { classId, comments });
    },

    // ===== CMS (Class Managers) =====
    async getCMs() {
        return await this.call('/cms');
    },

    async getCM(id) {
        return await this.call(`/cms/${id}`);
    },

    async createCM(cmData) {
        return await this.call('/cms', 'POST', cmData);
    },

    async updateCM(id, cmData) {
        return await this.call(`/cms/${id}`, 'PUT', cmData);
    },

    async deleteCM(id) {
        return await this.call(`/cms/${id}`, 'DELETE');
    },

    async getCMDetails(id) {
        return await this.call(`/cms/${id}/details`);
    },

    async getCMStatistics(id) {
        return await this.call(`/cms/${id}/statistics`);
    },

    async searchCMs(keyword) {
        return await this.call(`/cms/search?q=${encodeURIComponent(keyword)}`);
    },

    async getActiveCMs() {
        return await this.call('/cms/active');
    }
};

// Helper functions
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('active');
}

function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    const container = document.querySelector('.main-content') || document.body;
    container.insertBefore(alertDiv, container.firstChild);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Helper: Get weekday name
function getWeekdayName(day) {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[day] || '';
}

// CM Cache (giữ nguyên logic cũ nếu cần)
const CMCache = {
    data: null,
    timestamp: null,
    ttl: 5 * 60 * 1000,

    async get() {
        const now = Date.now();
        if (this.data && this.timestamp && (now - this.timestamp < this.ttl)) {
            return this.data;
        }
        this.data = await API.getCMs();
        this.timestamp = now;
        return this.data;
    },

    invalidate() {
        this.data = null;
        this.timestamp = null;
    }
};

const CMAPI = {
    async getAll(useCache = true) {
        if (useCache) {
            return await CMCache.get();
        }
        return await API.getCMs();
    },

    async getById(id) {
        const cached = await CMCache.get();
        const cm = cached.find(c => c.id === parseInt(id));
        if (cm) return cm;
        return await API.getCM(id);
    },

    async create(cmData) {
        const result = await API.createCM(cmData);
        CMCache.invalidate();
        return result;
    },

    async update(id, cmData) {
        const result = await API.updateCM(id, cmData);
        CMCache.invalidate();
        return result;
    },

    async delete(id) {
        const result = await API.deleteCM(id);
        CMCache.invalidate();
        return result;
    }
};