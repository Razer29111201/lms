// ===== API SERVICE (WITH AUTO SESSIONS) =====

const API = {
    // Base API call function
    async call(action, data = {}) {
        try {
            showLoading();

            // Check if using demo mode
            if (!CONFIG.API_URL || CONFIG.API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
                console.warn('Demo mode: Using local storage');
                return await this.demoMode(action, data);
            }

            const url = `${CONFIG.API_URL}?action=${action}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: JSON.stringify(data),
                redirect: 'follow'
            });

            const result = await response.json();
            hideLoading();

            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || 'API Error');
            }
        } catch (error) {
            hideLoading();
            console.error('API Error:', error);
            console.warn('API failed, switching to demo mode');
            return await this.demoMode(action, data);
        }
    },
    async request(action, data = {}) {
        const url = `${CONFIG.API_URL}?action=${action}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Unknown error');
            }

            return result.data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    // Demo mode using localStorage
    async demoMode(action, data) {
        await new Promise(resolve => setTimeout(resolve, 300));

        const storage = {
            classes: JSON.parse(localStorage.getItem('classflow_classes') || '[]'),
            students: JSON.parse(localStorage.getItem('classflow_students') || '[]'),
            teachers: JSON.parse(localStorage.getItem('classflow_teachers') || '[]'),
            sessions: JSON.parse(localStorage.getItem('classflow_sessions') || '{}'),
            attendance: JSON.parse(localStorage.getItem('classflow_attendance') || '{}'),
            comments: JSON.parse(localStorage.getItem('classflow_comments') || '{}')
        };

        // Initialize demo data if empty
        if (storage.classes.length === 0) {
            storage.classes = this.getDemoClasses();
            storage.students = this.getDemoStudents();
            storage.teachers = this.getDemoTeachers();

            // Generate sessions for demo classes
            storage.classes.forEach(cls => {
                storage.sessions[cls.id] = this.generateSessions(cls.startDate, cls.weekDay);
            });

            localStorage.setItem('classflow_classes', JSON.stringify(storage.classes));
            localStorage.setItem('classflow_students', JSON.stringify(storage.students));
            localStorage.setItem('classflow_teachers', JSON.stringify(storage.teachers));
            localStorage.setItem('classflow_sessions', JSON.stringify(storage.sessions));
        }

        hideLoading();

        switch (action) {
            // CLASSES
            case 'getClasses':
                // Auto-count students for each class
                return storage.classes.map(cls => {
                    const studentCount = storage.students.filter(s => s.classId === cls.id).length;
                    const sessions = storage.sessions[cls.id] || [];
                    return {
                        ...cls,
                        students: studentCount,
                        sessions: sessions,
                        totalSessions: sessions.length
                    };
                });

            case 'getClass':
                const cls = storage.classes.find(c => c.id === data.id);
                if (cls) {
                    const studentCount = storage.students.filter(s => s.classId === cls.id).length;
                    const sessions = storage.sessions[cls.id] || [];
                    return {
                        ...cls,
                        students: studentCount,
                        sessions: sessions,
                        totalSessions: sessions.length
                    };
                }
                return null;

            case 'createClass':
                const newClass = {
                    ...data,
                    id: Date.now(),
                    students: 0
                };

                // Generate sessions
                const newSessions = this.generateSessions(data.startDate, data.weekDay);
                storage.sessions[newClass.id] = newSessions;
                newClass.sessions = newSessions;
                newClass.totalSessions = newSessions.length;

                storage.classes.push(newClass);
                localStorage.setItem('classflow_classes', JSON.stringify(storage.classes));
                localStorage.setItem('classflow_sessions', JSON.stringify(storage.sessions));
                return newClass;

            case 'updateClass':
                const classIndex = storage.classes.findIndex(c => c.id === data.id);
                if (classIndex !== -1) {
                    storage.classes[classIndex] = { ...storage.classes[classIndex], ...data };

                    // Regenerate sessions if startDate or weekDay changed
                    const updatedSessions = this.generateSessions(data.startDate, data.weekDay);
                    storage.sessions[data.id] = updatedSessions;
                    storage.classes[classIndex].sessions = updatedSessions;
                    storage.classes[classIndex].totalSessions = updatedSessions.length;

                    localStorage.setItem('classflow_classes', JSON.stringify(storage.classes));
                    localStorage.setItem('classflow_sessions', JSON.stringify(storage.sessions));
                    return storage.classes[classIndex];
                }
                throw new Error('Class not found');

            case 'deleteClass':
                storage.classes = storage.classes.filter(c => c.id !== data.id);
                delete storage.sessions[data.id];
                localStorage.setItem('classflow_classes', JSON.stringify(storage.classes));
                localStorage.setItem('classflow_sessions', JSON.stringify(storage.sessions));
                return { success: true };

            // SESSIONS
            case 'getSessions':
                return storage.sessions[data.classId] || [];

            case 'updateSessions':
                storage.sessions[data.classId] = data.sessions;
                localStorage.setItem('classflow_sessions', JSON.stringify(storage.sessions));
                return { success: true };

            // STUDENTS
            case 'getStudents':
                return storage.students;

            case 'getStudent':
                return storage.students.find(s => s.id === data.id);

            case 'createStudent':
                const newStudent = { ...data, id: Date.now() };
                storage.students.push(newStudent);
                localStorage.setItem('classflow_students', JSON.stringify(storage.students));
                return newStudent;

            case 'updateStudent':
                const studentIndex = storage.students.findIndex(s => s.id === data.id);
                if (studentIndex !== -1) {
                    storage.students[studentIndex] = { ...storage.students[studentIndex], ...data };
                    localStorage.setItem('classflow_students', JSON.stringify(storage.students));
                    return storage.students[studentIndex];
                }
                throw new Error('Student not found');

            case 'deleteStudent':
                storage.students = storage.students.filter(s => s.id !== data.id);
                localStorage.setItem('classflow_students', JSON.stringify(storage.students));
                return { success: true };

            // TEACHERS
            case 'getTeachers':
                return storage.teachers;

            case 'getTeacher':
                return storage.teachers.find(t => t.id === data.id);

            case 'createTeacher':
                const newTeacher = { ...data, id: Date.now() };
                storage.teachers.push(newTeacher);
                localStorage.setItem('classflow_teachers', JSON.stringify(storage.teachers));
                return newTeacher;

            case 'updateTeacher':
                const teacherIndex = storage.teachers.findIndex(t => t.id === data.id);
                if (teacherIndex !== -1) {
                    storage.teachers[teacherIndex] = { ...storage.teachers[teacherIndex], ...data };
                    localStorage.setItem('classflow_teachers', JSON.stringify(storage.teachers));
                    return storage.teachers[teacherIndex];
                }
                throw new Error('Teacher not found');

            case 'deleteTeacher':
                storage.teachers = storage.teachers.filter(t => t.id !== data.id);
                localStorage.setItem('classflow_teachers', JSON.stringify(storage.teachers));
                return { success: true };

            // ATTENDANCE (by session date)
            case 'getAttendance':
                const key = `${data.classId}_${data.sessionDate}`;
                return storage.attendance[key] || [];

            case 'saveAttendance':
                const attendanceKey = `${data.classId}_${data.sessionDate}`;
                storage.attendance[attendanceKey] = data.records;
                localStorage.setItem('classflow_attendance', JSON.stringify(storage.attendance));
                return { success: true };

            // COMMENTS
            case 'getComments':
                return storage.comments[data.classId] || {};

            case 'saveComments':
                storage.comments[data.classId] = data.comments;
                localStorage.setItem('classflow_comments', JSON.stringify(storage.comments));
                return { success: true };

            default:
                throw new Error('Unknown action: ' + action);
        }
    },

    // Generate session dates
    generateSessions(startDate, weekDay, total = 15) {
        const sessions = [];
        const start = new Date(startDate);

        // Find first occurrence of target weekday
        let current = new Date(start);
        while (current.getDay() !== weekDay) {
            current.setDate(current.getDate() + 1);
        }

        // Generate sessions
        for (let i = 0; i < total; i++) {
            sessions.push({
                number: i + 1,
                date: current.toISOString().split('T')[0],
                status: 'scheduled',
                note: ''
            });
            current.setDate(current.getDate() + 7); // Next week
        }

        return sessions;
    },

    // Get demo data
    getDemoClasses() {
        return [
            {
                id: 1,
                name: 'Lập trình Web Frontend',
                code: 'WEB101',
                teacher: 'Trần Thị B',
                teacherId: 1,
                cm: 'Hoàng Văn E',
                cmId: 1,
                startDate: '2024-09-02',
                weekDay: 1, // Monday
                timeSlot: '18:00-20:00',
                color: 'green'
            },
            {
                id: 2,
                name: 'Tiếng Anh Giao Tiếp',
                code: 'ENG202',
                teacher: 'Nguyễn Văn C',
                teacherId: 2,
                cm: 'Phạm Thị F',
                cmId: 2,
                startDate: '2024-09-03',
                weekDay: 2, // Tuesday
                timeSlot: '19:00-21:00',
                color: 'blue'
            },
            {
                id: 3,
                name: 'Python Data Science',
                code: 'PY301',
                teacher: 'Lê Thị D',
                teacherId: 3,
                cm: 'Hoàng Văn E',
                cmId: 1,
                startDate: '2024-10-10',
                weekDay: 4, // Thursday
                timeSlot: '18:30-21:00',
                color: 'orange'
            }
        ];
    },

    getDemoStudents() {
        return [
            {
                id: 1,
                code: '2024001',
                name: 'Hoàng Ngọc Anh',
                email: 'hoangngoc@email.com',
                phone: '0901234567',
                classId: 1,
                className: 'WEB101'
            },
            {
                id: 2,
                code: '2024002',
                name: 'Trần Minh Bảo',
                email: 'tranminh@email.com',
                phone: '0901234568',
                classId: 1,
                className: 'WEB101'
            },
            {
                id: 3,
                code: '2024003',
                name: 'Lê Thị Cẩm',
                email: 'lethicam@email.com',
                phone: '0901234569',
                classId: 2,
                className: 'ENG202'
            },
            {
                id: 4,
                code: '2024004',
                name: 'Phạm Văn Đức',
                email: 'phamvanduc@email.com',
                phone: '0901234570',
                classId: 3,
                className: 'PY301'
            },
            {
                id: 5,
                code: '2024005',
                name: 'Nguyễn Thị Hoa',
                email: 'nguyenhoa@email.com',
                phone: '0901234571',
                classId: 1,
                className: 'WEB101'
            },
            {
                id: 6,
                code: '2024006',
                name: 'Võ Văn Nam',
                email: 'vovannam@email.com',
                phone: '0901234572',
                classId: 2,
                className: 'ENG202'
            },
            {
                id: 7,
                code: '2024007',
                name: 'Đặng Thị Mai',
                email: 'dangthimai@email.com',
                phone: '0901234573',
                classId: 3,
                className: 'PY301'
            }
        ];
    },

    getDemoTeachers() {
        return [
            {
                id: 1,
                code: 'GV001',
                name: 'Trần Thị B',
                email: 'tranthi.b@email.com',
                phone: '0912345678',
                subject: 'Web Development',
                active: true
            },
            {
                id: 2,
                code: 'GV002',
                name: 'Nguyễn Văn C',
                email: 'nguyenvan.c@email.com',
                phone: '0912345679',
                subject: 'English & Marketing',
                active: true
            },
            {
                id: 3,
                code: 'GV003',
                name: 'Lê Thị D',
                email: 'lethi.d@email.com',
                phone: '0912345680',
                subject: 'Data Science',
                active: true
            }
        ];
    },

    // Specific API methods

    // Get all CMs
    async getCMs() {
        return await this.request('getCMs');
    },

    // Get single CM by ID
    async getCM(id) {
        return await this.request('getCM', { id });
    },

    // Create new CM
    async createCM(cmData) {
        return await this.request('createCM', cmData);
    },

    // Update existing CM
    async updateCM(id, cmData) {
        return await this.request('updateCM', { ...cmData, id });
    },

    // Delete CM
    async deleteCM(id) {
        return await this.request('deleteCM', { id });
    },

    // Get CM with full details (classes, students, etc.)
    async getCMDetails(id) {
        return await this.request('getCMWithDetails', { id });
    },

    // Get CM statistics
    async getCMStatistics(id) {
        return await this.request('getCMStatistics', { id });
    },

    // Search CMs
    async searchCMs(keyword) {
        return await this.request('searchCMs', { keyword });
    },

    // Get active CMs only
    async getActiveCMs() {
        return await this.request('getActiveCMs');
    },

    // Bulk update CM status
    async bulkUpdateCMStatus(cmIds, active) {
        return await this.request('bulkUpdateCMStatus', { cmIds, active });
    },

    // Get CM report (for export)
    async getCMReport(id) {
        return await this.request('getCMReport', { id });
    },
    async getClasses() {
        return await this.call('getClasses');
    },

    async getClass(id) {
        return await this.call('getClass', { id });
    },

    async createClass(classData) {
        return await this.call('createClass', classData);
    },

    async updateClass(id, classData) {
        return await this.call('updateClass', { id, ...classData });
    },

    async deleteClass(id) {
        return await this.call('deleteClass', { id });
    },

    async getSessions(classId) {
        return await this.call('getSessions', { classId });
    },

    async updateSessions(classId, sessions) {
        return await this.call('updateSessions', { classId, sessions });
    },

    async getStudents() {
        return await this.call('getStudents');
    },

    async getStudent(id) {
        return await this.call('getStudent', { id });
    },

    async createStudent(studentData) {
        return await this.call('createStudent', studentData);
    },

    async updateStudent(id, studentData) {
        return await this.call('updateStudent', { id, ...studentData });
    },

    async deleteStudent(id) {
        return await this.call('deleteStudent', { id });
    },

    async getTeachers() {
        return await this.call('getTeachers');
    },

    async getTeacher(id) {
        return await this.call('getTeacher', { id });
    },

    async createTeacher(teacherData) {
        return await this.call('createTeacher', teacherData);
    },

    async updateTeacher(id, teacherData) {
        return await this.call('updateTeacher', { id, ...teacherData });
    },

    async deleteTeacher(id) {
        return await this.call('deleteTeacher', { id });
    },

    async getAttendance(classId, sessionDate) {
        return await this.call('getAttendance', { classId, sessionDate });
    },

    async saveAttendance(classId, sessionDate, records) {
        return await this.call('saveAttendance', { classId, sessionDate, records });
    },

    async getComments(classId) {
        return await this.call('getComments', { classId });
    },

    async saveComments(classId, comments) {
        return await this.call('saveComments', { classId, comments });
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

// Helper: Get weekday name in Vietnamese
function getWeekdayName(day) {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[day] || '';
}
function previewSessions() {
    const startDate = document.getElementById('classStartDate').value;
    const weekDay = document.getElementById('classWeekDay').value;

    if (!startDate || weekDay === '') {
        document.getElementById('sessionsPreview').style.display = 'none';
        return;
    }

    // Generate preview
    const sessions = generateSessionsPreview(startDate, parseInt(weekDay));

    // Display preview
    const previewList = document.getElementById('sessionsPreviewList');
    const firstFive = sessions.slice(0, 5);
    const last = sessions[sessions.length - 1];

    previewList.innerHTML = `
        <div>• Buổi 1: ${formatDateVN(firstFive[0].date)}</div>
        <div>• Buổi 2: ${formatDateVN(firstFive[1].date)}</div>
        <div>• Buổi 3: ${formatDateVN(firstFive[2].date)}</div>
        <div>• Buổi 4: ${formatDateVN(firstFive[3].date)}</div>
        <div>• Buổi 5: ${formatDateVN(firstFive[4].date)}</div>
        <div style="margin: 4px 0;">...</div>
        <div>• Buổi 15: ${formatDateVN(last.date)}</div>
    `;

    document.getElementById('sessionsPreview').style.display = 'block';
}

function generateSessionsPreview(startDate, weekDay, total = 15) {
    const sessions = [];
    const start = new Date(startDate);

    // Find first occurrence of weekday
    let current = new Date(start);
    while (current.getDay() !== weekDay) {
        current.setDate(current.getDate() + 1);
    }

    // Generate sessions
    for (let i = 0; i < total; i++) {
        sessions.push({
            number: i + 1,
            date: current.toISOString().split('T')[0]
        });
        current.setDate(current.getDate() + 7);
    }

    return sessions;
}

function formatDateVN(dateStr) {
    const date = new Date(dateStr);
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return `${days[date.getDay()]}, ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

// Cache for CM data to reduce API calls
const CMCache = {
    data: null,
    timestamp: null,
    ttl: 5 * 60 * 1000, // 5 minutes

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
    },

    update(cmId, updatedCM) {
        if (this.data) {
            const index = this.data.findIndex(cm => cm.id === cmId);
            if (index !== -1) {
                this.data[index] = updatedCM;
            }
        }
    },

    remove(cmId) {
        if (this.data) {
            this.data = this.data.filter(cm => cm.id !== cmId);
        }
    },

    add(newCM) {
        if (this.data) {
            this.data.push(newCM);
        }
    }
};

// Enhanced API wrapper with caching
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

        if (cm) {
            return cm;
        }

        return await API.getCM(id);
    },

    async create(cmData) {
        const result = await API.createCM(cmData);
        CMCache.add(result);
        return result;
    },

    async update(id, cmData) {
        const result = await API.updateCM(id, cmData);
        CMCache.update(id, result);
        return result;
    },

    async delete(id) {
        const result = await API.deleteCM(id);
        CMCache.remove(id);
        return result;
    },

    async search(keyword) {
        const cms = await CMCache.get();
        const lowerKeyword = keyword.toLowerCase();

        return cms.filter(cm =>
            cm.code.toLowerCase().includes(lowerKeyword) ||
            cm.name.toLowerCase().includes(lowerKeyword) ||
            cm.email.toLowerCase().includes(lowerKeyword) ||
            cm.phone.includes(keyword)
        );
    },

    async getActive() {
        const cms = await CMCache.get();
        return cms.filter(cm => cm.active === true);
    },

    invalidateCache() {
        CMCache.invalidate();
    }
};

// ===== UTILITY FUNCTIONS FOR CM =====

// Get CM dropdown options for forms
async function getCMOptions() {
    const cms = await CMAPI.getActive();
    return cms.map(cm => ({
        value: cm.id,
        label: `${cm.code} - ${cm.name}`
    }));
}

// Validate CM data before save
function validateCMData(cmData) {
    const errors = [];

    if (!cmData.code || cmData.code.trim() === '') {
        errors.push('Mã CM không được để trống');
    }

    if (!cmData.name || cmData.name.trim() === '') {
        errors.push('Tên CM không được để trống');
    }

    if (cmData.email && !isValidEmail(cmData.email)) {
        errors.push('Email không hợp lệ');
    }

    if (cmData.phone && !isValidPhone(cmData.phone)) {
        errors.push('Số điện thoại không hợp lệ');
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Check if CM can be deleted (has no classes)
async function canDeleteCM(cmId) {
    const classes = await API.getClasses();
    const managedClasses = classes.filter(c => c.cmId === cmId);

    return {
        canDelete: managedClasses.length === 0,
        classCount: managedClasses.length,
        classes: managedClasses
    };
}

// Get CM performance metrics
async function getCMPerformanceMetrics(cmId) {
    try {
        const cm = await API.getCM(cmId);
        const classes = await API.getClasses();
        const cmClasses = classes.filter(c => c.cmId === cmId);

        let totalStudents = 0;
        let totalSessions = 0;
        let completedSessions = 0;
        let attendanceRecords = 0;
        let presentCount = 0;

        for (const cls of cmClasses) {
            totalStudents += cls.students || 0;
            const sessions = cls.sessions || [];
            totalSessions += sessions.length;

            for (const session of sessions) {
                if (session.status === 'completed') {
                    completedSessions++;
                }

                try {
                    const records = await API.getAttendance(cls.id, session.date);
                    attendanceRecords += records.length;
                    presentCount += records.filter(r =>
                        r.status === 'on-time' || r.status === 'late'
                    ).length;
                } catch (error) {
                    console.error('Error loading attendance:', error);
                }
            }
        }

        const attendanceRate = attendanceRecords > 0
            ? (presentCount / attendanceRecords * 100).toFixed(1)
            : 0;

        return {
            cm: cm,
            metrics: {
                totalClasses: cmClasses.length,
                totalStudents: totalStudents,
                totalSessions: totalSessions,
                completedSessions: completedSessions,
                completionRate: totalSessions > 0
                    ? (completedSessions / totalSessions * 100).toFixed(1)
                    : 0,
                attendanceRate: attendanceRate,
                averageClassSize: cmClasses.length > 0
                    ? (totalStudents / cmClasses.length).toFixed(1)
                    : 0
            }
        };
    } catch (error) {
        console.error('Error calculating CM metrics:', error);
        throw error;
    }
}

// Helper: Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Helper: Validate phone format (Vietnam)
function isValidPhone(phone) {
    const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}