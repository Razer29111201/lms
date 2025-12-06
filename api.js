// ===== API SERVICE =====

const API = {
    // Base API call function
    async call(action, data = {}) {
        try {
            showLoading();

            // // Check if using demo mode (no API URL configured)
            // if (!CONFIG.API_URL || CONFIG.API_URL === 'https://script.google.com/macros/s/AKfycbzFwUtiMQIL4TBLh-8ORkDoL55iAuC2dWDRA_mn_nvTMPIiJsu_CYXYOF628R_DtZ0v/exec') {
            //     console.warn('Demo mode: Using local storage');
            //     return await this.demoMode(action, data);
            // }

            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action, data })
            });
            console.log(response);

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
            showAlert('error', 'Lỗi kết nối: ' + error.message);
            throw error;
        }
    },

    // Demo mode using localStorage
    async demoMode(action, data) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

        const storage = {
            classes: JSON.parse(localStorage.getItem('classes') || '[]'),
            students: JSON.parse(localStorage.getItem('students') || '[]'),
            teachers: JSON.parse(localStorage.getItem('teachers') || '[]'),
            attendance: JSON.parse(localStorage.getItem('attendance') || '{}'),
            comments: JSON.parse(localStorage.getItem('comments') || '{}')
        };

        // Initialize demo data if empty
        if (storage.classes.length === 0) {
            storage.classes = this.getDemoClasses();
            storage.students = this.getDemoStudents();
            storage.teachers = this.getDemoTeachers();
            localStorage.setItem('classes', JSON.stringify(storage.classes));
            localStorage.setItem('students', JSON.stringify(storage.students));
            localStorage.setItem('teachers', JSON.stringify(storage.teachers));
        }

        hideLoading();

        switch (action) {
            // CLASSES
            case 'getClasses':
                return storage.classes;

            case 'getClass':
                return storage.classes.find(c => c.id === data.id);

            case 'createClass':
                const newClass = { ...data, id: Date.now() };
                storage.classes.push(newClass);
                localStorage.setItem('classes', JSON.stringify(storage.classes));
                return newClass;

            case 'updateClass':
                const classIndex = storage.classes.findIndex(c => c.id === data.id);
                if (classIndex !== -1) {
                    storage.classes[classIndex] = { ...storage.classes[classIndex], ...data };
                    localStorage.setItem('classes', JSON.stringify(storage.classes));
                    return storage.classes[classIndex];
                }
                throw new Error('Class not found');

            case 'deleteClass':
                storage.classes = storage.classes.filter(c => c.id !== data.id);
                localStorage.setItem('classes', JSON.stringify(storage.classes));
                return { success: true };

            // STUDENTS
            case 'getStudents':
                return storage.students;

            case 'getStudent':
                return storage.students.find(s => s.id === data.id);

            case 'createStudent':
                const newStudent = { ...data, id: Date.now() };
                storage.students.push(newStudent);
                localStorage.setItem('students', JSON.stringify(storage.students));
                return newStudent;

            case 'updateStudent':
                const studentIndex = storage.students.findIndex(s => s.id === data.id);
                if (studentIndex !== -1) {
                    storage.students[studentIndex] = { ...storage.students[studentIndex], ...data };
                    localStorage.setItem('students', JSON.stringify(storage.students));
                    return storage.students[studentIndex];
                }
                throw new Error('Student not found');

            case 'deleteStudent':
                storage.students = storage.students.filter(s => s.id !== data.id);
                localStorage.setItem('students', JSON.stringify(storage.students));
                return { success: true };

            // TEACHERS
            case 'getTeachers':
                return storage.teachers;

            case 'getTeacher':
                return storage.teachers.find(t => t.id === data.id);

            case 'createTeacher':
                const newTeacher = { ...data, id: Date.now() };
                storage.teachers.push(newTeacher);
                localStorage.setItem('teachers', JSON.stringify(storage.teachers));
                return newTeacher;

            case 'updateTeacher':
                const teacherIndex = storage.teachers.findIndex(t => t.id === data.id);
                if (teacherIndex !== -1) {
                    storage.teachers[teacherIndex] = { ...storage.teachers[teacherIndex], ...data };
                    localStorage.setItem('teachers', JSON.stringify(storage.teachers));
                    return storage.teachers[teacherIndex];
                }
                throw new Error('Teacher not found');

            case 'deleteTeacher':
                storage.teachers = storage.teachers.filter(t => t.id !== data.id);
                localStorage.setItem('teachers', JSON.stringify(storage.teachers));
                return { success: true };

            // ATTENDANCE
            case 'getAttendance':
                return storage.attendance[`${data.classId}_${data.session}`] || [];

            case 'saveAttendance':
                const key = `${data.classId}_${data.session}`;
                storage.attendance[key] = data.records;
                localStorage.setItem('attendance', JSON.stringify(storage.attendance));
                return { success: true };

            // COMMENTS
            case 'getComments':
                return storage.comments[data.classId] || {};

            case 'saveComments':
                storage.comments[data.classId] = data.comments;
                localStorage.setItem('comments', JSON.stringify(storage.comments));
                return { success: true };

            default:
                throw new Error('Unknown action: ' + action);
        }
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
                students: 28,
                start: '2024-09-01',
                end: '2024-11-30',
                schedule: 'T2,T4,T6: 18:00-20:00',
                sessions: 15,
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
                students: 22,
                start: '2024-09-15',
                end: '2024-12-15',
                schedule: 'T3,T5,T7: 19:00-21:00',
                sessions: 15,
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
                students: 18,
                start: '2024-10-10',
                end: '2025-01-10',
                schedule: 'T2,T4: 18:30-21:00',
                sessions: 15,
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
                subject: 'English',
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

    async getAttendance(classId, session) {
        return await this.call('getAttendance', { classId, session });
    },

    async saveAttendance(classId, session, records) {
        return await this.call('saveAttendance', { classId, session, records });
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
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
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