// api.js - SINGLE SOURCE OF TRUTH

const CONFIG = {
    API_URL: 'http://localhost:8080/api',
    SESSION_KEY: 'lms_session',
    SESSION_TIMEOUT: 1000 * 60 * 60 * 24,
    CARD_COLORS: ['green', 'blue', 'purple', 'orange', 'red', 'cyan']
};

const API = {
    async call(endpoint, method = 'GET', data = null) {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' }
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }

            const url = `${CONFIG.API_URL}${endpoint}`;
            console.log(`🌐 ${method} ${url}`);

            const response = await fetch(url, options);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ API Error:', error);
            throw error;
        }
    },

    async login(email, password) {
        const response = await this.call('/auth/login', 'POST', { email, password });

        if (response && response.success && response.data) {
            return response.data;
        }

        if (response && response.user) {
            return response;
        }

        throw new Error('Invalid response format');
    },

    async getClasses() {
        const response = await this.call('/classes', 'GET');
        return response.data || response || [];
    },

    async getSessions(classId) {
        const response = await this.call(`/sessions/${classId}`, 'GET');
        return response.data || response || [];
    },

    async getStudents(classId = null) {
        const endpoint = classId ? `/students?classId=${classId}` : '/students';
        const response = await this.call(endpoint, 'GET');
        return response.data || response || [];
    },

    async getTeachers() {
        const response = await this.call('/teachers', 'GET');
        return response.data || response || [];
    },

    async getCMs() {
        const response = await this.call('/cms', 'GET');
        return response.data || response || [];
    },

    async getAttendance(classId, sessionNumber) {
        const response = await this.call(`/attendance/${classId}/${sessionNumber}`, 'GET');
        return response.data || response || [];
    },

    async saveAttendance(classId, session, records) {
        return await this.call('/attendance', 'POST', { classId, session, records });
    },

    async createClass(classData) {
        const response = await this.call('/classes', 'POST', classData);
        return response.data || response;
    },

    async updateClass(id, classData) {
        const response = await this.call(`/classes/${id}`, 'PUT', classData);
        return response.data || response;
    },

    async deleteClass(id) {
        return await this.call(`/classes/${id}`, 'DELETE');
    },

    async createStudent(studentData) {
        const response = await this.call('/students', 'POST', studentData);
        return response.data || response;
    },

    async updateStudent(id, studentData) {
        const response = await this.call(`/students/${id}`, 'PUT', studentData);
        return response.data || response;
    },

    async deleteStudent(id) {
        return await this.call(`/students/${id}`, 'DELETE');
    },

    async createTeacher(teacherData) {
        const response = await this.call('/teachers', 'POST', teacherData);
        return response.data || response;
    },

    async updateTeacher(id, teacherData) {
        const response = await this.call(`/teachers/${id}`, 'PUT', teacherData);
        return response.data || response;
    },

    async deleteTeacher(id) {
        return await this.call(`/teachers/${id}`, 'DELETE');
    },

    async getCM(id) {
        const response = await this.call(`/cms/${id}`, 'GET');
        return response.data || response;
    },

    async createCM(cmData) {
        const response = await this.call('/cms', 'POST', cmData);
        return response.data || response;
    },

    async updateCM(id, cmData) {
        const response = await this.call(`/cms/${id}`, 'PUT', cmData);
        return response.data || response;
    },

    async deleteCM(id) {
        return await this.call(`/cms/${id}`, 'DELETE');
    }
};

const CMAPI = {
    getAll: () => API.getCMs(),
    create: (data) => API.createCM(data),
    update: (id, data) => API.updateCM(id, data),
    delete: (id) => API.deleteCM(id)
};

window.API = API;
window.CONFIG = CONFIG;
window.CMAPI = CMAPI;

console.log('✅ API initialized');