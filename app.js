// app.js - Role system với số (0=Admin, 1=Teacher, 2=CM)
// Refactored version với đầy đủ functions

// ===== GLOBAL STATE =====
let currentUser = null;
let classes = [];
let students = [];
let teachers = [];
let cms = [];
let currentClassId = null;
let currentSessionDate = null;
let currentSessionNumber = 1;
let sessionCache = {};

// ===== ROLE CONSTANTS =====
const ROLES = {
    ADMIN: 0,
    TEACHER: 1,
    CM: 2
};

const ROLE_NAMES = {
    0: 'admin',
    1: 'teacher',
    2: 'cm'
};

const ROLE_DISPLAY = {
    0: 'Admin',
    1: 'Giáo viên',
    2: 'Class Manager'
};

// ===== PERMISSIONS SYSTEM =====
const PERMISSIONS = {
    0: { // Admin
        classes: { view: true, create: true, edit: true, delete: true },
        students: { view: true, create: true, edit: true, delete: true },
        teachers: { view: true, create: true, edit: true, delete: true },
        cms: { view: true, create: true, edit: true, delete: true },
        attendance: { view: true, edit: true },
        comments: { view: true, edit: true },
        export: true
    },
    1: { // Teacher
        classes: { view: true, create: false, edit: false, delete: false },
        students: { view: true, create: false, edit: false, delete: false },
        teachers: { view: false, create: false, edit: false, delete: false },
        cms: { view: false, create: false, edit: false, delete: false },
        attendance: { view: true, edit: true },
        comments: { view: true, edit: true },
        export: true
    },
    2: { // CM
        classes: { view: true, create: true, edit: true, delete: true },
        students: { view: true, create: true, edit: true, delete: true },
        teachers: { view: true, create: false, edit: false, delete: false },
        cms: { view: true, create: false, edit: false, delete: false },
        attendance: { view: true, edit: false },
        comments: { view: true, edit: false },
        export: true
    }
};

// ===== PERMISSION HELPER =====
function hasPermission(action, resource, operation = 'view') {
    if (!currentUser) return false;

    const roleNum = currentUser.roleNum ?? parseInt(currentUser.role);
    const userPermissions = PERMISSIONS[roleNum];

    if (!userPermissions) return false;

    if (action === 'export') {
        return userPermissions.export === true;
    }

    return userPermissions[resource] && userPermissions[resource][operation] === true;
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
});

// ===== AUTHENTICATION & SESSION =====
function checkSession() {
    const saved = localStorage.getItem(CONFIG.SESSION_KEY);
    if (!saved) {
        showPage('loginPage');
        return;
    }

    try {
        const userData = JSON.parse(saved);
        const elapsed = Date.now() - (userData.timestamp || 0);
        if (elapsed < (CONFIG.SESSION_TIMEOUT || 1000 * 60 * 60 * 24)) {
            currentUser = userData;
            showPage('mainApp');
            updateUserUI();
            loadDashboard();
        } else {
            localStorage.removeItem(CONFIG.SESSION_KEY);
            showPage('loginPage');
        }
    } catch (e) {
        console.error('Invalid session data', e);
        localStorage.removeItem(CONFIG.SESSION_KEY);
        showPage('loginPage');
    }
}

async function login() {
    // ✅ GET VALUES FROM INPUT FIELDS
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showLoginAlert('error', 'Vui lòng nhập email và mật khẩu');
        return;
    }

    try {
        showLoading();

        // Call API
        const response = await API.login(email, password);

        if (response && response.user) {
            const roleNum = parseInt(response.user.role);
            const roleName = ROLE_NAMES[roleNum] || 'admin';

            currentUser = {
                ...response.user,
                role: roleName,
                roleNum: roleNum,
                timestamp: Date.now()
            };

            localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(currentUser));

            hideLoading();
            showPage('mainApp');
            updateUserUI();
            await loadDashboard();
            showLoginAlert('success', 'Đăng nhập thành công');

            setTimeout(() => {
                if (roleNum === ROLES.TEACHER || roleNum === ROLES.CM) {
                    showClasses();
                } else {
                    showDashboard();
                }
            }, 500);
        } else {
            hideLoading();
            showLoginAlert('error', 'Email hoặc mật khẩu không đúng');
        }
    } catch (error) {
        hideLoading();
        console.error('Login error:', error);
        showLoginAlert('error', 'Đăng nhập thất bại. Vui lòng thử lại.');
    }
}

function logout() {
    localStorage.removeItem(CONFIG.SESSION_KEY);
    currentUser = null;
    showPage('loginPage');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
}

function showLoginAlert(type, msg) {
    const el = document.getElementById('loginAlert');
    if (!el) return;
    el.className = `alert alert-${type}`;
    el.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> <span>${msg}</span>`;
    el.style.display = 'flex';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
}

// ===== UI NAVIGATION HELPERS =====
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
}

function showContent(contentId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(contentId);
    if (el) el.classList.add('active');
}

function setSidebarActive(index) {
    const menuItems = document.querySelectorAll('.sidebar-menu li a');
    menuItems.forEach((item, i) => {
        if (i === index) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// ===== USER UI =====
function updateUserUI() {
    if (!currentUser) return;

    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    const roleEl = document.getElementById('userRole');

    if (nameEl) nameEl.textContent = currentUser.name || '';
    if (avatarEl) avatarEl.textContent = (currentUser.avatar || currentUser.name || '').slice(0, 1).toUpperCase();

    if (roleEl) {
        const roleNum = currentUser.roleNum ?? parseInt(currentUser.role);
        const roleName = ROLE_NAMES[roleNum] || 'admin';

        roleEl.className = `badge badge-${roleName}`;
        roleEl.textContent = ROLE_DISPLAY[roleNum] || 'Admin';
    }

    // Update sidebar menu
    updateSidebarMenu();
}

function updateSidebarMenu() {
    const sidebar = document.querySelector('.sidebar-menu');
    if (!sidebar) return;

    const roleNum = currentUser?.roleNum ?? parseInt(currentUser?.role);

    // Base menu structure
    let menuHTML = '';

    // Dashboard - always visible
    menuHTML += '<li><a onclick="showDashboard()"><i class="fas fa-th-large"></i> Dashboard</a></li>';

    // Classes - visible to all roles
    menuHTML += '<li><a onclick="showClasses()"><i class="fas fa-chalkboard"></i> Lớp học</a></li>';

    // Students - visible to all roles
    menuHTML += '<li><a onclick="showStudents()"><i class="fas fa-user-graduate"></i> Học sinh</a></li>';

    // Teachers - visible to admin and cm (role 0 and 2)
    if (roleNum === ROLES.ADMIN || roleNum === ROLES.CM) {
        menuHTML += '<li><a onclick="showTeachers()"><i class="fas fa-chalkboard-teacher"></i> Giáo viên</a></li>';
    }

    // CMs - only admin (role 0)
    if (roleNum === ROLES.ADMIN) {
        menuHTML += '<li><a onclick="showCMs()"><i class="fas fa-user-shield"></i> Class Manager</a></li>';
    }

    sidebar.innerHTML = menuHTML;

    // Set active state for dashboard
    const firstLink = sidebar.querySelector('li a');
    if (firstLink) firstLink.classList.add('active');
}

// ===== DASHBOARD / LOADING DATA =====
async function loadDashboard() {
    try {
        showLoading();

        [classes, students, teachers, cms] = await Promise.all([
            API.getClasses().catch(() => []),
            API.getStudents().catch(() => []),
            API.getTeachers().catch(() => []),
            API.getCMs ? API.getCMs().catch(() => []) : Promise.resolve([])
        ]);

        let filteredClasses = classes;
        const roleNum = currentUser?.roleNum ?? parseInt(currentUser?.role);

        if (roleNum === ROLES.TEACHER) {
            filteredClasses = classes.filter(c => c.teacherId === currentUser.teacherId);
        } else if (roleNum === ROLES.CM) {
            filteredClasses = classes.filter(c => c.cmId === currentUser.cmId);
        }

        document.getElementById('totalClasses').textContent = filteredClasses.length;
        document.getElementById('totalStudents').textContent = students.length;
        document.getElementById('totalTeachers').textContent = teachers.length;

        renderClassCards(filteredClasses.slice(0, 3), 'dashboardClasses');
        hideLoading();
    } catch (err) {
        hideLoading();
        console.error('loadDashboard error', err);
        showAlert('error', 'Không thể tải dashboard');
    }
}

async function showDashboard() {
    showContent('dashboardContent');
    setSidebarActive(0);
    await loadDashboard();
}

// ===== CLASSES =====
async function loadClasses() {
    try {
        showLoading();
        classes = await API.getClasses();

        // Filter by role
        let filtered = classes;
        const roleNum = currentUser?.roleNum ?? parseInt(currentUser?.role);

        if (roleNum === ROLES.TEACHER) {
            filtered = classes.filter(c => c.teacherId === currentUser.teacherId);
        } else if (roleNum === ROLES.CM) {
            filtered = classes.filter(c => c.cmId === currentUser.cmId);
        }

        console.log('Loaded classes:', filtered);
        renderClassCards(filtered, 'classesGrid');
        hideLoading();
    } catch (err) {
        hideLoading();
        console.error('loadClasses error:', err);
        showAlert('error', 'Không thể tải danh sách lớp: ' + err.message);
    }
}

async function showClasses() {
    showContent('classesContent');
    setSidebarActive(1);
    await loadClasses();
}

function renderClassCards(classList, containerId) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error('Container not found:', containerId);
        return;
    }

    if (!classList || classList.length === 0) {
        container.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-light);">
                <i class="fas fa-inbox" style="font-size:48px;opacity:0.4"></i>
                <h3>Không có lớp học</h3>
                <p>${hasPermission('', 'classes', 'create') ? 'Nhấn "Thêm lớp" để tạo mới.' : ''}</p>
            </div>
        `;
        return;
    }

    const html = classList.map(cls => {
        const weekday = getWeekdayName(cls.weekDay);

        return `
        <div class="class-card" onclick="window.viewClassDetail(${cls.id})">
            <div class="card-header ${cls.color || 'green'}">
                <h3>${cls.name || 'Chưa có tên'}</h3>
                <div class="class-code">Mã: ${cls.code || ''}</div>
            </div>
            <div class="card-body">
                <div class="card-info">
                    <div class="card-info-item"><i class="fas fa-user-tie"></i><span>GV: ${cls.teacher || 'Chưa có'}</span></div>
                    <div class="card-info-item"><i class="fas fa-user-shield"></i><span>CM: ${cls.cm || 'Chưa có'}</span></div>
                    <div class="card-info-item"><i class="fas fa-users"></i><span>${cls.students || 0} học sinh</span></div>
                    <div class="card-info-item"><i class="fas fa-calendar"></i><span>Bắt đầu: ${formatDate(cls.startDate)}</span></div>
                    <div class="card-info-item"><i class="fas fa-clock"></i><span>${weekday}: ${cls.timeSlot || 'Chưa có'}</span></div>
                    <div class="card-info-item"><i class="fas fa-list"></i><span>${cls.totalSessions || 15} buổi</span></div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary" style="flex:1" onclick="event.stopPropagation(); window.viewClassDetail(${cls.id})">
                        <i class="fas fa-eye"></i> Chi tiết
                    </button>
                    ${hasPermission('', 'classes', 'edit') ? `
                        <button class="action-btn edit" onclick="event.stopPropagation(); window.editClass(${cls.id})" title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                    ${hasPermission('', 'classes', 'delete') ? `
                        <button class="action-btn delete" onclick="event.stopPropagation(); window.deleteClass(${cls.id})" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = html;
}

// Mở modal thêm lớp
function openAddClassModal() {
    document.getElementById('classModalTitle').innerHTML = '<i class="fas fa-plus"></i> Thêm lớp học';
    document.getElementById('classId').value = '';
    document.getElementById('className').value = '';
    document.getElementById('classCode').value = '';
    document.getElementById('classStartDate').value = '';
    document.getElementById('classWeekDay').value = '';
    document.getElementById('classTimeSlot').value = '';
    document.getElementById('sessionsPreview').style.display = 'none';

    populateTeachersSelect();
    populateCMSelect();
    openModal('classModal');
}

// Chỉnh sửa lớp
async function editClass(classId) {
    try {
        const cls = classes.find(c => c.id === classId);
        if (!cls) {
            showAlert('error', 'Không tìm thấy lớp học');
            return;
        }

        document.getElementById('classModalTitle').innerHTML = '<i class="fas fa-edit"></i> Chỉnh sửa lớp học';
        document.getElementById('classId').value = cls.id;
        document.getElementById('className').value = cls.name || '';
        document.getElementById('classCode').value = cls.code || '';
        document.getElementById('classStartDate').value = cls.startDate || '';
        document.getElementById('classWeekDay').value = cls.weekDay != null ? cls.weekDay : '';
        document.getElementById('classTimeSlot').value = cls.timeSlot || '';

        await populateTeachersSelect();
        await populateCMSelect();

        if (cls.teacherId) {
            document.getElementById('classTeacher').value = cls.teacherId;
        }
        if (cls.cmId) {
            document.getElementById('classCM').value = cls.cmId;
        }

        previewSessions();
        openModal('classModal');

    } catch (err) {
        console.error('editClass error:', err);
        showAlert('error', 'Không thể chỉnh sửa lớp: ' + err.message);
    }
}

// Lưu lớp
async function saveClass() {
    try {
        const id = document.getElementById('classId').value;
        const name = document.getElementById('className').value.trim();
        const code = document.getElementById('classCode').value.trim();
        const startDate = document.getElementById('classStartDate').value;
        const weekDay = document.getElementById('classWeekDay').value;
        const timeSlot = document.getElementById('classTimeSlot').value.trim();

        if (!name || !code) {
            showAlert('error', 'Vui lòng nhập tên lớp và mã lớp');
            return;
        }
        if (!startDate) {
            showAlert('error', 'Vui lòng chọn ngày bắt đầu');
            return;
        }
        if (weekDay === '') {
            showAlert('error', 'Vui lòng chọn thứ trong tuần');
            return;
        }
        if (!timeSlot) {
            showAlert('error', 'Vui lòng nhập khung giờ học');
            return;
        }

        const teacherId = parseInt(document.getElementById('classTeacher').value) || 0;
        const cmId = parseInt(document.getElementById('classCM').value) || 0;

        const teacher = teachers.find(t => t.id === teacherId);
        const cm = cms.find(c => c.id === cmId);

        const payload = {
            name,
            code,
            teacherId,
            teacher: teacher ? teacher.name : '',
            cmId,
            cm: cm ? cm.name : '',
            startDate,
            weekDay: parseInt(weekDay),
            timeSlot,
            color: CONFIG.CARD_COLORS[Math.floor(Math.random() * CONFIG.CARD_COLORS.length)],
            totalSessions: 15
        };

        if (id) {
            payload.id = parseInt(id);
            await API.updateClass(parseInt(id), payload);
            showAlert('success', 'Đã cập nhật lớp học thành công!');
        } else {
            await API.createClass(payload);
            showAlert('success', 'Đã tạo lớp học mới. Hệ thống đã tạo 15 buổi mặc định.');
        }

        closeModal('classModal');
        await loadClasses();
        await loadDashboard();
    } catch (err) {
        console.error('saveClass error', err);
        showAlert('error', 'Lỗi khi lưu lớp: ' + (err.message || ''));
    }
}

// Xóa lớp
async function deleteClass(classId) {
    try {
        const cls = classes.find(c => c.id === classId);
        if (!cls) {
            showAlert('error', 'Không tìm thấy lớp học');
            return;
        }

        if (!confirm(`Bạn có chắc muốn xóa lớp "${cls.name}"?`)) {
            return;
        }

        showLoading();
        await API.deleteClass(classId);
        hideLoading();

        showAlert('success', 'Đã xóa lớp học thành công');
        await loadClasses();
        await loadDashboard();

    } catch (err) {
        hideLoading();
        console.error('deleteClass error:', err);
        showAlert('error', 'Không thể xóa lớp: ' + err.message);
    }
}

// ===== POPULATE SELECTS =====
async function populateTeachersSelect() {
    try {
        if (!teachers || teachers.length === 0) {
            teachers = await API.getTeachers();
        }
        const html = '<option value="">Chọn giáo viên</option>' +
            teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        const el = document.getElementById('classTeacher');
        if (el) el.innerHTML = html;
    } catch (err) {
        console.error('populateTeachersSelect error', err);
    }
}

async function populateCMSelect() {
    try {
        if (!cms || cms.length === 0) {
            cms = await CMAPI.getAll();
        }
        const html = '<option value="">Chọn CM</option>' +
            cms.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        const el = document.getElementById('classCM');
        if (el) el.innerHTML = html;
    } catch (err) {
        console.error('populateCMSelect error', err);
    }
}

// ===== ATTENDANCE CACHE =====
const attendanceCache = {
    data: {},
    has(classId, sessionNumber) {
        const key = `${classId}_${sessionNumber}`;
        return this.data.hasOwnProperty(key);
    },
    get(classId, sessionNumber) {
        const key = `${classId}_${sessionNumber}`;
        return this.data[key] || [];
    },
    set(classId, sessionNumber, records) {
        const key = `${classId}_${sessionNumber}`;
        this.data[key] = records;
    },
    clear() {
        this.data = {};
    }
};

// ===== CLASS DETAIL & SESSIONS =====
function renderClassStudentsQuick(classId) {
    const classStudents = students.filter(s => s.classId === classId);
    const container = document.getElementById('classStudentsList');

    if (classStudents.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--text-light);">Chưa có học sinh</p>';
        return;
    }

    container.innerHTML = classStudents.map(s => `
        <div class="student-item" data-student-id="${s.id}">
            <div class="student-avatar">${getInitials(s.name)}</div>
            <div class="student-info">
                <h4>${s.name}</h4>
                <p>MSSV: ${s.code} • ${s.email}</p>
            </div>
            <div class="student-stats">
                <div class="student-stat"><strong style="color: #94a3b8;">-</strong><span>Đúng giờ</span></div>
                <div class="student-stat"><strong style="color: #94a3b8;">-</strong><span>Muộn</span></div>
                <div class="student-stat"><strong style="color: #94a3b8;">-</strong><span>Có phép</span></div>
                <div class="student-stat"><strong style="color: #94a3b8;">-</strong><span>Vắng</span></div>
            </div>
        </div>
    `).join('');
}

async function viewClassDetail(classId) {
    try {
        currentClassId = classId;
        const cls = classes.find(c => c.id === classId);

        if (!cls) {
            showAlert('error', 'Không tìm thấy lớp học');
            return;
        }

        attendanceCache.clear();

        document.getElementById('classDetailHeader').innerHTML = `
            <h3>${cls.name}</h3>
            <p style="opacity:0.9;margin-bottom:8px">Mã lớp: ${cls.code}</p>
            <div class="class-info-grid">
                <div class="class-info-box"><label>Giáo viên</label><strong>${cls.teacher || 'Chưa có'}</strong></div>
                <div class="class-info-box"><label>Class Manager</label><strong>${cls.cm || 'Chưa có'}</strong></div>
                <div class="class-info-box"><label>Số học sinh</label><strong>${cls.students || 0}</strong></div>
                <div class="class-info-box"><label>Bắt đầu</label><strong>${formatDate(cls.startDate)}</strong></div>
                <div class="class-info-box"><label>Buổi học</label><strong>${cls.totalSessions || 15} buổi</strong></div>
            </div>
        `;

        renderClassStudentsQuick(classId);
        await renderSessionsGridOptimized(classId);
        openModal('classDetailModal');
        loadAttendanceStatsBackground(classId);

    } catch (err) {
        console.error('viewClassDetail error:', err);
        showAlert('error', 'Không thể mở chi tiết lớp: ' + err.message);
    }
}

async function loadAttendanceStatsBackground(classId) {
    const classStudents = students.filter(s => s.classId === classId);
    const cls = classes.find(c => c.id === classId);

    const attendanceStats = {};
    classStudents.forEach(s => {
        attendanceStats[s.id] = { onTime: 0, late: 0, excused: 0, absent: 0 };
    });

    try {
        const totalSessions = cls?.totalSessions || 15;

        const promises = [];
        for (let session = 1; session <= totalSessions; session++) {
            promises.push(
                API.getAttendance(classId, session)
                    .then(records => ({ session, records }))
                    .catch(() => ({ session, records: [] }))
            );
        }

        const results = await Promise.all(promises);

        results.forEach(({ session, records }) => {
            attendanceCache.set(classId, session, records);

            records.forEach(record => {
                const studentId = parseInt(record.studentid || record.studentId);
                if (attendanceStats[studentId]) {
                    switch (record.status) {
                        case 'on-time': attendanceStats[studentId].onTime++; break;
                        case 'late': attendanceStats[studentId].late++; break;
                        case 'excused': attendanceStats[studentId].excused++; break;
                        case 'absent': attendanceStats[studentId].absent++; break;
                    }
                }
            });
        });

        updateStudentStatsUI(attendanceStats);
        updateSessionStatsUI(classId);

    } catch (error) {
        console.error('Error loading attendance stats:', error);
    }
}

function updateStudentStatsUI(attendanceStats) {
    Object.keys(attendanceStats).forEach(studentId => {
        const stats = attendanceStats[studentId];
        const studentItem = document.querySelector(`.student-item[data-student-id="${studentId}"] .student-stats`);

        if (studentItem) {
            studentItem.innerHTML = `
                <div class="student-stat"><strong style="color: #10b981;">${stats.onTime}</strong><span>Đúng giờ</span></div>
                <div class="student-stat"><strong style="color: #f59e0b;">${stats.late}</strong><span>Muộn</span></div>
                <div class="student-stat"><strong style="color: #06b6d4;">${stats.excused}</strong><span>Có phép</span></div>
                <div class="student-stat"><strong style="color: #ef4444;">${stats.absent}</strong><span>Vắng</span></div>
            `;
        }
    });
}

function updateSessionStatsUI(classId) {
    const sessionCards = document.querySelectorAll('.session-card');

    sessionCards.forEach(card => {
        const sessionNumber = parseInt(card.dataset.sessionNumber);
        const records = attendanceCache.get(classId, sessionNumber);

        if (!records || records.length === 0) return;

        const stats = {
            onTime: records.filter(r => r.status === 'on-time').length,
            late: records.filter(r => r.status === 'late').length,
            excused: records.filter(r => r.status === 'excused').length,
            absent: records.filter(r => r.status === 'absent').length
        };

        const total = stats.onTime + stats.late + stats.excused + stats.absent;

        if (total === 0) return;

        const statusP = card.querySelector('p:nth-of-type(2)');
        if (statusP) {
            statusP.textContent = 'Đã điểm danh';
        }

        let statsDiv = card.querySelector('.session-stats');

        if (!statsDiv) {
            const placeholder = card.querySelector('.session-stats-placeholder');
            if (placeholder) {
                placeholder.remove();
            }

            const newStatsHTML = `
                <div class="session-stats">
                    <div class="session-stat">
                        <span>${stats.onTime}</span>
                        <span>✓</span>
                    </div>
                    <div class="session-stat">
                        <span>${stats.late}</span>
                        <span>⏰</span>
                    </div>
                    <div class="session-stat">
                        <span>${stats.absent}</span>
                        <span>✗</span>
                    </div>
                </div>
            `;
            card.insertAdjacentHTML('beforeend', newStatsHTML);
        } else {
            statsDiv.innerHTML = `
                <div class="session-stat">
                    <span>${stats.onTime}</span>
                    <span>✓</span>
                </div>
                <div class="session-stat">
                    <span>${stats.late}</span>
                    <span>⏰</span>
                </div>
                <div class="session-stat">
                    <span>${stats.absent}</span>
                    <span>✗</span>
                </div>
            `;
        }
    });
}

async function renderSessionsGridOptimized(classId) {
    const container = document.getElementById('sessionsGrid');
    if (!container) return;

    try {
        showLoading();

        let sessions = await API.getSessions(classId);

        if (!sessions || sessions.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-light);">
                    <i class="fas fa-info-circle" style="font-size: 48px; opacity: 0.4; margin-bottom: 16px;"></i>
                    <h3>Chưa có buổi học</h3>
                    <p>Lớp học này chưa có lịch học.</p>
                </div>
            `;
            hideLoading();
            return;
        }

        const parsedSessions = sessions.map(s => ({
            id: s.id,
            classId: s.class_id || s.classId,
            number: s.session_number || s.number,
            date: s.date,
            status: s.status || 'scheduled',
            note: s.note || ''
        }));

        const sessionStatsMap = {};

        for (const session of parsedSessions) {
            try {
                const records = await API.getAttendance(classId, session.number);
                attendanceCache.set(classId, session.number, records);

                sessionStatsMap[session.number] = {
                    onTime: records.filter(r => r.status === 'on-time').length,
                    late: records.filter(r => r.status === 'late').length,
                    excused: records.filter(r => r.status === 'excused').length,
                    absent: records.filter(r => r.status === 'absent').length,
                    total: records.length
                };
            } catch (error) {
                console.error(`Error loading attendance for session ${session.number}:`, error);
                sessionStatsMap[session.number] = {
                    onTime: 0, late: 0, excused: 0, absent: 0, total: 0
                };
            }
        }

        let html = '';
        parsedSessions.forEach((session, index) => {
            const stats = sessionStatsMap[session.number];
            const hasData = stats && stats.total > 0;
            const isPast = new Date(session.date) < new Date();
            const isActive = index === 0 ? 'active' : '';

            let statusText = 'Sắp tới';
            if (hasData) {
                statusText = 'Đã điểm danh';
            } else if (isPast) {
                statusText = 'Chưa điểm danh';
            }

            html += `
                <div class="session-card ${isActive}" 
                     data-session-number="${session.number}"
                     onclick="selectSession(${session.number}, '${session.date}')">
                    <h4>Buổi ${session.number}</h4>
                    <p style="font-size: 12px;">${formatDate(session.date)}</p>
                    <p style="font-size: 11px; opacity: 0.8;">${statusText}</p>
                    ${hasData ? `
                        <div class="session-stats">
                            <div class="session-stat">
                                <span>${stats.onTime}</span>
                                <span>✓</span>
                            </div>
                            <div class="session-stat">
                                <span>${stats.late}</span>
                                <span>⏰</span>
                            </div>
                            <div class="session-stat">
                                <span>${stats.absent}</span>
                                <span>✗</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        container.innerHTML = html;
        hideLoading();

        if (parsedSessions.length > 0) {
            await renderAttendanceTable(parsedSessions[0].number, parsedSessions[0].date);
        }

    } catch (error) {
        hideLoading();
        console.error('Error rendering sessions grid:', error);
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; color: var(--danger); margin-bottom: 16px;"></i>
                <h3>Không thể tải danh sách buổi học</h3>
                <p style="color: var(--text-light);">${error.message}</p>
            </div>
        `;
    }
}

let currentSession = null;

async function selectSession(sessionNumber, sessionDate) {
    currentSession = sessionNumber;
    currentSessionDate = sessionDate;

    document.querySelectorAll('.session-card').forEach(card => {
        card.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    await renderAttendanceTable(sessionNumber, sessionDate);
}

async function renderAttendanceTable(sessionNumber, sessionDate) {
    const classStudents = students.filter(s =>
        (s.classId || s.class_id) === currentClassId
    );
    const container = document.getElementById('attendanceTableContainer');
    if (!container) return;

    currentSession = sessionNumber;
    currentSessionDate = sessionDate;

    try {
        showLoading();

        let attendanceRecords = [];
        if (attendanceCache.has(currentClassId, sessionNumber)) {
            attendanceRecords = attendanceCache.get(currentClassId, sessionNumber);
        } else {
            attendanceRecords = await API.getAttendance(currentClassId, sessionNumber);
            attendanceCache.set(currentClassId, sessionNumber, attendanceRecords);
        }

        const attendanceMap = {};
        attendanceRecords.forEach(record => {
            const studentId = record.student_id || record.studentId || record.studentid;
            attendanceMap[studentId] = {
                status: record.status || 'on-time',
                note: record.note || ''
            };
        });

        const canEdit = hasPermission('', 'attendance', 'edit');

        container.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                <h3>Điểm danh Buổi ${sessionNumber} - ${formatDate(sessionDate)}</h3>
                ${canEdit ? `
                    <button class="btn btn-primary" onclick="saveAttendance()">
                        <i class="fas fa-save"></i> Lưu điểm danh
                    </button>
                ` : '<span class="badge badge-info">Chỉ xem</span>'}
            </div>
            <table>
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Họ tên</th>
                        <th>MSSV</th>
                        <th>Trạng thái</th>
                        <th>Ghi chú</th>
                    </tr>
                </thead>
                <tbody>
                    ${classStudents.map((s, i) => {
            const attendance = attendanceMap[s.id] || { status: 'on-time', note: '' };
            return `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${s.name}</td>
                                <td>${s.code}</td>
                                <td>
                                    <div class="attendance-status">
                                        <button class="status-btn on-time ${attendance.status === 'on-time' ? 'active' : ''}" 
                                            onclick="setAttendance(this)" ${!canEdit ? 'disabled' : ''}>
                                            <i class="fas fa-check"></i> Đúng giờ
                                        </button>
                                        <button class="status-btn late ${attendance.status === 'late' ? 'active' : ''}" 
                                            onclick="setAttendance(this)" ${!canEdit ? 'disabled' : ''}>
                                            <i class="fas fa-clock"></i> Muộn
                                        </button>
                                        <button class="status-btn excused ${attendance.status === 'excused' ? 'active' : ''}" 
                                            onclick="setAttendance(this)" ${!canEdit ? 'disabled' : ''}>
                                            <i class="fas fa-file-alt"></i> Có phép
                                        </button>
                                        <button class="status-btn absent ${attendance.status === 'absent' ? 'active' : ''}" 
                                            onclick="setAttendance(this)" ${!canEdit ? 'disabled' : ''}>
                                            <i class="fas fa-times"></i> Vắng
                                        </button>
                                    </div>
                                </td>
                                <td>
                                    <input type="text" class="note-input" 
                                        placeholder="Ghi chú..." 
                                        value="${attendance.note || ''}" 
                                        data-student-id="${s.id}" 
                                        ${!canEdit ? 'readonly' : ''}>
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;

        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('Error rendering attendance table:', error);
        container.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>Không thể tải bảng điểm danh: ${error.message}</span>
            </div>
        `;
    }
}

function setAttendance(btn) {
    const tr = btn.closest('tr');
    if (!tr) return;
    tr.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

async function saveAttendance() {
    try {
        if (!currentSession) {
            showAlert('error', 'Chưa chọn buổi học');
            return;
        }

        const records = [];
        const rows = document.querySelectorAll('#attendanceTableContainer tbody tr');

        rows.forEach(row => {
            const activeBtn = row.querySelector('.status-btn.active');
            const noteInput = row.querySelector('.note-input');
            const studentId = noteInput.dataset.studentId;

            if (activeBtn && studentId) {
                let status = 'on-time';
                if (activeBtn.classList.contains('late')) status = 'late';
                else if (activeBtn.classList.contains('excused')) status = 'excused';
                else if (activeBtn.classList.contains('absent')) status = 'absent';

                records.push({
                    studentId: parseInt(studentId),
                    status,
                    note: noteInput.value || ''
                });
            }
        });

        showLoading();
        await API.saveAttendance(currentClassId, currentSession, records);

        attendanceCache.set(currentClassId, currentSession, records.map(r => ({
            studentid: r.studentId,
            student_id: r.studentId,
            status: r.status,
            note: r.note
        })));

        hideLoading();
        showAlert('success', `Đã lưu điểm danh buổi ${currentSession} thành công!`);

        updateSessionStatsUI(currentClassId);

    } catch (error) {
        hideLoading();
        console.error('Error saving attendance:', error);
        showAlert('error', 'Không thể lưu điểm danh: ' + error.message);
    }
}

// ===== STUDENTS CRUD =====
async function loadStudents() {
    try {
        showLoading();
        students = await API.getStudents();

        if (!classes || classes.length === 0) {
            classes = await API.getClasses();
        }

        console.log('Loaded students:', students);
        renderStudentsTable();
        hideLoading();
    } catch (err) {
        hideLoading();
        console.error('loadStudents error:', err);
        showAlert('error', 'Không thể tải danh sách học sinh: ' + err.message);
    }
}

async function showStudents() {
    showContent('studentsContent');
    setSidebarActive(2);
    await loadStudents();
}

function renderStudentsTable() {
    const tbody = document.getElementById('studentsTable');
    if (!tbody) return;

    if (!students || students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px">Chưa có học sinh</td></tr>';
        return;
    }

    tbody.innerHTML = students.map(s => `
        <tr>
            <td>${s.code || ''}</td>
            <td>
                <div style="display:flex;align-items:center;gap:12px">
                    <div class="avatar" style="width:36px;height:36px;font-size:14px">${getInitials(s.name)}</div>
                    <span>${s.name}</span>
                </div>
            </td>
            <td>${s.email || ''}</td>
            <td>${s.phone || ''}</td>
            <td>${s.className || ''}</td>
            <td>
                ${hasPermission('', 'students', 'edit') ? `
                    <button class="action-btn edit" onclick="window.editStudent(${s.id})" title="Chỉnh sửa"><i class="fas fa-edit"></i></button>
                ` : ''}
                ${hasPermission('', 'students', 'delete') ? `
                    <button class="action-btn delete" onclick="window.deleteStudent(${s.id})" title="Xóa"><i class="fas fa-trash"></i></button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

async function openAddStudentModal() {
    document.getElementById('studentModalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Thêm học sinh';
    document.getElementById('studentId').value = '';
    document.getElementById('studentCode').value = '';
    document.getElementById('studentName').value = '';
    document.getElementById('studentEmail').value = '';
    document.getElementById('studentPhone').value = '';
    await populateClassesSelect();
    openModal('studentModal');
}

async function editStudent(studentId) {
    try {
        const s = students.find(x => x.id === studentId);
        if (!s) {
            showAlert('error', 'Không tìm thấy học sinh');
            return;
        }

        document.getElementById('studentModalTitle').innerHTML = '<i class="fas fa-edit"></i> Chỉnh sửa học sinh';
        document.getElementById('studentId').value = s.id;
        document.getElementById('studentCode').value = s.code || '';
        document.getElementById('studentName').value = s.name || '';
        document.getElementById('studentEmail').value = s.email || '';
        document.getElementById('studentPhone').value = s.phone || '';

        await populateClassesSelect();
        document.getElementById('studentClass').value = s.classId || '';

        openModal('studentModal');
    } catch (err) {
        console.error('editStudent error:', err);
        showAlert('error', 'Không thể chỉnh sửa học sinh: ' + err.message);
    }
}

async function deleteStudent(studentId) {
    try {
        const s = students.find(x => x.id === studentId);
        if (!s) {
            showAlert('error', 'Không tìm thấy học sinh');
            return;
        }

        if (!confirm(`Bạn có chắc muốn xóa học sinh "${s.name}"?`)) {
            return;
        }

        showLoading();
        await API.deleteStudent(studentId);
        hideLoading();

        showAlert('success', 'Đã xóa học sinh thành công');
        await loadStudents();
        await loadDashboard();

    } catch (err) {
        hideLoading();
        console.error('deleteStudent error:', err);
        showAlert('error', 'Không thể xóa học sinh: ' + err.message);
    }
}

async function saveStudent() {
    try {
        const id = document.getElementById('studentId').value;
        const code = document.getElementById('studentCode').value.trim();
        const name = document.getElementById('studentName').value.trim();
        if (!code || !name) { showAlert('error', 'Nhập mã và tên'); return; }
        const classId = parseInt(document.getElementById('studentClass').value) || 0;
        const cls = classes.find(c => c.id === classId);

        const payload = {
            code, name,
            email: document.getElementById('studentEmail').value.trim(),
            phone: document.getElementById('studentPhone').value.trim(),
            classId,
            className: cls ? cls.code : ''
        };

        if (id) {
            await API.updateStudent(parseInt(id), payload);
            showAlert('success', 'Cập nhật học sinh thành công');
        } else {
            await API.createStudent(payload);
            showAlert('success', 'Thêm học sinh thành công');
        }

        closeModal('studentModal');
        await loadStudents();
        await loadDashboard();
    } catch (err) {
        console.error('saveStudent error', err);
        showAlert('error', 'Không thể lưu học sinh');
    }
}

async function populateClassesSelect() {
    try {
        if (!classes || classes.length === 0) classes = await API.getClasses();
        const el = document.getElementById('studentClass');
        if (!el) return;
        const html = '<option value="">Chọn lớp học</option>' + classes.map(c => `<option value="${c.id}">${c.code} - ${c.name}</option>`).join('');
        el.innerHTML = html;
    } catch (err) {
        console.error('populateClassesSelect error', err);
    }
}

// ===== TEACHERS CRUD =====
async function loadTeachers() {
    try {
        showLoading();
        teachers = await API.getTeachers();
        console.log('Loaded teachers:', teachers);
        renderTeachersTable();
        hideLoading();
    } catch (err) {
        hideLoading();
        console.error('loadTeachers error:', err);
        showAlert('error', 'Không thể tải danh sách giáo viên: ' + err.message);
    }
}

async function showTeachers() {
    showContent('teachersContent');
    setSidebarActive(3);
    await loadTeachers();
}

function renderTeachersTable() {
    const tbody = document.getElementById('teachersTable');
    if (!tbody) return;

    if (!teachers || teachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px">Chưa có giáo viên</td></tr>';
        return;
    }

    tbody.innerHTML = teachers.map(t => `
        <tr>
            <td>${t.code || ''}</td>
            <td>
                <div style="display:flex;align-items:center;gap:12px">
                    <div class="avatar" style="width:36px;height:36px;font-size:14px">${getInitials(t.name)}</div>
                    <span>${t.name}</span>
                </div>
            </td>
            <td>${t.email || ''}</td>
            <td>${t.phone || ''}</td>
            <td>${t.subject || ''}</td>
            <td><span class="status ${t.active ? 'status-active' : 'status-pending'}">${t.active ? 'Hoạt động' : 'Tạm dừng'}</span></td>
            <td>
                ${hasPermission('', 'teachers', 'edit') ? `
                    <button class="action-btn edit" onclick="window.editTeacher(${t.id})" title="Chỉnh sửa"><i class="fas fa-edit"></i></button>
                ` : ''}
                ${hasPermission('', 'teachers', 'delete') ? `
                    <button class="action-btn delete" onclick="window.deleteTeacher(${t.id})" title="Xóa"><i class="fas fa-trash"></i></button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function openAddTeacherModal() {
    document.getElementById('teacherModalTitle').innerHTML = '<i class="fas fa-chalkboard-teacher"></i> Thêm giáo viên';
    document.getElementById('teacherId').value = '';
    document.getElementById('teacherCode').value = '';
    document.getElementById('teacherName').value = '';
    document.getElementById('teacherEmail').value = '';
    document.getElementById('teacherPhone').value = '';
    document.getElementById('teacherSubject').value = '';
    openModal('teacherModal');
}

async function editTeacher(teacherId) {
    const t = teachers.find(x => x.id === teacherId);
    if (!t) return;
    document.getElementById('teacherModalTitle').innerHTML = '<i class="fas fa-edit"></i> Chỉnh sửa giáo viên';
    document.getElementById('teacherId').value = t.id;
    document.getElementById('teacherCode').value = t.code || '';
    document.getElementById('teacherName').value = t.name || '';
    document.getElementById('teacherEmail').value = t.email || '';
    document.getElementById('teacherPhone').value = t.phone || '';
    document.getElementById('teacherSubject').value = t.subject || '';
    openModal('teacherModal');
}

async function saveTeacher() {
    try {
        const id = document.getElementById('teacherId').value;
        const code = document.getElementById('teacherCode').value.trim();
        const name = document.getElementById('teacherName').value.trim();
        if (!code || !name) { showAlert('error', 'Nhập mã và tên'); return; }
        const payload = {
            code, name,
            email: document.getElementById('teacherEmail').value.trim(),
            phone: document.getElementById('teacherPhone').value.trim(),
            subject: document.getElementById('teacherSubject').value.trim(),
            active: true
        };
        if (id) {
            await API.updateTeacher(parseInt(id), payload);
            showAlert('success', 'Cập nhật giáo viên thành công');
        } else {
            await API.createTeacher(payload);
            showAlert('success', 'Thêm giáo viên thành công');
        }
        closeModal('teacherModal');
        await loadTeachers();
        await loadDashboard();
    } catch (err) {
        console.error('saveTeacher error', err);
        showAlert('error', 'Không thể lưu giáo viên');
    }
}

async function deleteTeacher(teacherId) {
    try {
        const t = teachers.find(x => x.id === teacherId);
        if (!t) {
            showAlert('error', 'Không tìm thấy giáo viên');
            return;
        }

        if (!confirm(`Bạn có chắc muốn xóa giáo viên "${t.name}"?`)) {
            return;
        }

        showLoading();
        await API.deleteTeacher(teacherId);
        hideLoading();

        showAlert('success', 'Đã xóa giáo viên thành công');
        await loadTeachers();
        await loadDashboard();

    } catch (err) {
        hideLoading();
        console.error('deleteTeacher error:', err);
        showAlert('error', 'Không thể xóa giáo viên: ' + err.message);
    }
}

// ===== CM CRUD =====
async function showCMs() {
    showContent('cmsContent');
    setSidebarActive(4);
    await loadCMs();
}

async function loadCMs() {
    try {
        showLoading();
        cms = await CMAPI.getAll();

        if (!classes || classes.length === 0) {
            classes = await API.getClasses();
        }

        console.log('Loaded CMs:', cms);
        renderCMsTable();
        hideLoading();
    } catch (err) {
        hideLoading();
        console.error('loadCMs error:', err);
        showAlert('error', 'Không thể tải danh sách CM: ' + err.message);
    }
}

function renderCMsTable() {
    const tbody = document.getElementById('cmsTable');
    if (!tbody) return;

    if (!cms || cms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px">Chưa có Class Manager</td></tr>';
        return;
    }

    const cmClassCount = {};
    classes.forEach(c => {
        if (c.cmId) cmClassCount[c.cmId] = (cmClassCount[c.cmId] || 0) + 1;
    });

    tbody.innerHTML = cms.map(cm => `
        <tr>
            <td>${cm.code || ''}</td>
            <td>
                <div style="display:flex;align-items:center;gap:12px">
                    <div class="avatar" style="width:36px;height:36px;font-size:14px">${getInitials(cm.name)}</div>
                    <span>${cm.name}</span>
                </div>
            </td>
            <td>${cm.email || ''}</td>
            <td>${cm.phone || ''}</td>
            <td><strong style="color:var(--primary)">${cmClassCount[cm.id] || 0}</strong> lớp</td>
            <td><span class="status ${cm.active ? 'status-active' : 'status-pending'}">${cm.active ? 'Hoạt động' : 'Tạm dừng'}</span></td>
            <td>
                <button class="action-btn view" onclick="window.viewCMDetail(${cm.id})" title="Xem chi tiết"><i class="fas fa-eye"></i></button>
                ${hasPermission('', 'cms', 'edit') ? `
                    <button class="action-btn edit" onclick="window.editCM(${cm.id})" title="Chỉnh sửa"><i class="fas fa-edit"></i></button>
                ` : ''}
                ${hasPermission('', 'cms', 'delete') ? `
                    <button class="action-btn delete" onclick="window.deleteCM(${cm.id})" title="Xóa"><i class="fas fa-trash"></i></button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

async function openAddCMModal() {
    document.getElementById('cmModalTitle').innerHTML = '<i class="fas fa-user-shield"></i> Thêm Class Manager';
    document.getElementById('cmId').value = '';
    document.getElementById('cmCode').value = '';
    document.getElementById('cmName').value = '';
    document.getElementById('cmEmail').value = '';
    document.getElementById('cmPhone').value = '';
    openModal('cmModal');
}

async function editCM(cmId) {
    try {
        const cm = cms.find(c => c.id === cmId);
        if (!cm) {
            showAlert('error', 'Không tìm thấy CM');
            return;
        }

        document.getElementById('cmModalTitle').innerHTML = '<i class="fas fa-edit"></i> Chỉnh sửa Class Manager';
        document.getElementById('cmId').value = cm.id;
        document.getElementById('cmCode').value = cm.code || '';
        document.getElementById('cmName').value = cm.name || '';
        document.getElementById('cmEmail').value = cm.email || '';
        document.getElementById('cmPhone').value = cm.phone || '';

        openModal('cmModal');
    } catch (err) {
        console.error('editCM error:', err);
        showAlert('error', 'Không thể chỉnh sửa CM: ' + err.message);
    }
}

async function deleteCM(cmId) {
    try {
        const cm = cms.find(c => c.id === cmId);
        if (!cm) {
            showAlert('error', 'Không tìm thấy CM');
            return;
        }

        const managed = classes.filter(c => c.cmId === cmId);
        if (managed.length > 0) {
            const names = managed.map(x => x.name).join(', ');
            if (!confirm(`CM đang quản lý ${managed.length} lớp (${names}). Xóa sẽ để trống CM cho các lớp này. Bạn có chắc?`)) {
                return;
            }
        } else {
            if (!confirm(`Bạn có chắc muốn xóa CM "${cm.name}"?`)) {
                return;
            }
        }

        showLoading();
        await CMAPI.delete(cmId);
        hideLoading();

        showAlert('success', 'Đã xóa CM thành công');
        await loadCMs();
        await loadDashboard();

    } catch (err) {
        hideLoading();
        console.error('deleteCM error:', err);
        showAlert('error', 'Không thể xóa CM: ' + err.message);
    }
}

async function saveCM() {
    try {
        const id = document.getElementById('cmId').value;
        const code = document.getElementById('cmCode').value.trim();
        const name = document.getElementById('cmName').value.trim();
        const email = document.getElementById('cmEmail').value.trim();
        const phone = document.getElementById('cmPhone').value.trim();
        const payload = { code, name, email, phone, active: true };
        if (!name) { showAlert('error', 'Tên CM không được để trống'); return; }
        if (id) {
            await CMAPI.update(parseInt(id), payload);
            showAlert('success', 'Cập nhật CM thành công');
        } else {
            await CMAPI.create(payload);
            showAlert('success', 'Thêm CM thành công');
        }
        closeModal('cmModal');
        await loadCMs();
        await loadDashboard();
    } catch (err) {
        console.error('saveCM error', err);
        showAlert('error', 'Không thể lưu CM');
    }
}

async function viewCMDetail(cmId) {
    try {
        showLoading();
        currentClassId = null;

        const cm = await API.getCM(cmId);
        if (!cm) {
            hideLoading();
            showAlert('error', 'Không tìm thấy CM');
            return;
        }

        const allClasses = await API.getClasses();
        const cmClasses = allClasses.filter(c =>
            (c.cmId || c.cm_id) === parseInt(cmId)
        );

        document.getElementById('cmDetailHeader').innerHTML = `
            <h3>${cm.name}</h3>
            <p style="opacity:0.9;margin-bottom:8px">Mã CM: ${cm.code || 'N/A'}</p>
            <div class="class-info-grid">
                <div class="class-info-box">
                    <label>Email</label>
                    <strong>${cm.email || 'Chưa có'}</strong>
                </div>
                <div class="class-info-box">
                    <label>Số điện thoại</label>
                    <strong>${cm.phone || 'Chưa có'}</strong>
                </div>
                <div class="class-info-box">
                    <label>Trạng thái</label>
                    <strong>${cm.active ? '✓ Hoạt động' : '⊘ Tạm dừng'}</strong>
                </div>
                <div class="class-info-box">
                    <label>Số lớp quản lý</label>
                    <strong>${cmClasses.length} lớp</strong>
                </div>
            </div>
        `;

        renderCMClasses(cmClasses);
        await renderCMAttendanceStats(cmId, cmClasses);

        hideLoading();
        openModal('cmDetailModal');
    } catch (error) {
        hideLoading();
        console.error('viewCMDetail error:', error);
        showAlert('error', 'Không thể tải thông tin CM: ' + error.message);
    }
}

function renderCMClasses(cmClasses) {
    const container = document.getElementById('cmClassesList');
    if (!container) return;

    if (cmClasses.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-light);">
                <i class="fas fa-inbox" style="font-size: 64px; margin-bottom: 16px; opacity: 0.5;"></i>
                <h3 style="font-size: 20px; margin-bottom: 8px;">Chưa quản lý lớp nào</h3>
                <p>CM này chưa được gán quản lý lớp học nào.</p>
            </div>
        `;
        return;
    }

    const html = cmClasses.map(cls => {
        const weekdayName = getWeekdayName(cls.weekDay || cls.week_day);
        const startDate = cls.startDate || cls.start_date;
        const timeSlot = cls.timeSlot || cls.time_slot;

        return `
            <div class="class-card" onclick="viewClassDetail(${cls.id})">
                <div class="card-header ${cls.color || 'green'}">
                    <h3>${cls.name || 'Chưa có tên'}</h3>
                    <div class="class-code">Mã: ${cls.code || 'N/A'}</div>
                </div>
                <div class="card-body">
                    <div class="card-info">
                        <div class="card-info-item">
                            <i class="fas fa-user-tie"></i>
                            <span>GV: ${cls.teacher || 'Chưa có'}</span>
                        </div>
                        <div class="card-info-item">
                            <i class="fas fa-users"></i>
                            <span>${cls.students || 0} học sinh</span>
                        </div>
                        <div class="card-info-item">
                            <i class="fas fa-calendar"></i>
                            <span>Bắt đầu: ${formatDate(startDate)}</span>
                        </div>
                        <div class="card-info-item">
                            <i class="fas fa-clock"></i>
                            <span>${weekdayName}: ${timeSlot || 'Chưa có'}</span>
                        </div>
                        <div class="card-info-item">
                            <i class="fas fa-list"></i>
                            <span>${cls.totalSessions || cls.total_sessions || 15} buổi học</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-primary" style="flex:1" onclick="event.stopPropagation(); viewClassDetail(${cls.id})">
                            <i class="fas fa-eye"></i> Chi tiết lớp
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

async function renderCMAttendanceStats(cmId, cmClasses) {
    const container = document.getElementById('cmAttendanceStats');
    if (!container) return;

    if (cmClasses.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                <span>Chưa có dữ liệu điểm danh vì CM này chưa quản lý lớp nào.</span>
            </div>
        `;
        return;
    }

    try {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="spinner" style="width: 40px; height: 40px; margin: 0 auto;"></div>
                <p style="margin-top: 16px; color: var(--text-light);">Đang tải thống kê...</p>
            </div>
        `;

        let totalStats = {
            totalClasses: cmClasses.length,
            totalStudents: 0,
            totalSessions: 0,
            completedSessions: 0,
            attendanceRecords: 0,
            onTime: 0,
            late: 0,
            excused: 0,
            absent: 0
        };

        const classStats = [];

        for (const cls of cmClasses) {
            const classId = cls.id;

            const students = await API.getStudents();
            const classStudents = students.filter(s =>
                (s.classId || s.class_id) === classId
            );
            totalStats.totalStudents += classStudents.length;

            const sessions = await API.getSessions(classId);
            totalStats.totalSessions += sessions.length;

            let classAttendanceStats = {
                classId: classId,
                className: cls.name,
                classCode: cls.code,
                students: classStudents.length,
                sessions: sessions.length,
                onTime: 0,
                late: 0,
                excused: 0,
                absent: 0,
                totalRecords: 0
            };

            for (const session of sessions) {
                if (session.status === 'completed') {
                    totalStats.completedSessions++;
                }

                try {
                    const records = await API.getAttendance(classId, session.number || session.session_number);

                    classAttendanceStats.totalRecords += records.length;
                    totalStats.attendanceRecords += records.length;

                    records.forEach(record => {
                        const status = record.status;

                        if (status === 'on-time') {
                            classAttendanceStats.onTime++;
                            totalStats.onTime++;
                        } else if (status === 'late') {
                            classAttendanceStats.late++;
                            totalStats.late++;
                        } else if (status === 'excused') {
                            classAttendanceStats.excused++;
                            totalStats.excused++;
                        } else if (status === 'absent') {
                            classAttendanceStats.absent++;
                            totalStats.absent++;
                        }
                    });
                } catch (error) {
                    console.error(`Error loading attendance for session ${session.number}:`, error);
                }
            }

            classStats.push(classAttendanceStats);
        }

        const totalPresent = totalStats.onTime + totalStats.late;
        const attendanceRate = totalStats.attendanceRecords > 0
            ? ((totalPresent / totalStats.attendanceRecords) * 100).toFixed(1)
            : 0;

        container.innerHTML = `
            <div class="stats-grid" style="margin-bottom: 32px;">
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fas fa-chalkboard"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${totalStats.totalClasses}</h3>
                        <p>Lớp học</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <i class="fas fa-user-graduate"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${totalStats.totalStudents}</h3>
                        <p>Học sinh</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${totalStats.totalSessions}</h3>
                        <p>Tổng buổi học</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fas fa-percentage"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${attendanceRate}%</h3>
                        <p>Tỷ lệ có mặt</p>
                    </div>
                </div>
            </div>

            <div class="alert alert-info" style="margin-bottom: 24px;">
                <i class="fas fa-chart-pie"></i>
                <div>
                    <strong>Thống kê điểm danh tổng hợp:</strong>
                    <div style="margin-top: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
                        <div>
                            <strong style="color: #10b981; font-size: 24px;">${totalStats.onTime}</strong>
                            <p style="font-size: 13px; margin-top: 4px;">Đúng giờ</p>
                        </div>
                        <div>
                            <strong style="color: #f59e0b; font-size: 24px;">${totalStats.late}</strong>
                            <p style="font-size: 13px; margin-top: 4px;">Muộn</p>
                        </div>
                        <div>
                            <strong style="color: #06b6d4; font-size: 24px;">${totalStats.excused}</strong>
                            <p style="font-size: 13px; margin-top: 4px;">Có phép</p>
                        </div>
                        <div>
                            <strong style="color: #ef4444; font-size: 24px;">${totalStats.absent}</strong>
                            <p style="font-size: 13px; margin-top: 4px;">Vắng</p>
                        </div>
                    </div>
                </div>
            </div>

            <h3 style="margin-bottom: 16px;">Chi tiết từng lớp</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Mã lớp</th>
                            <th>Tên lớp</th>
                            <th>Học sinh</th>
                            <th>Buổi học</th>
                            <th>Đúng giờ</th>
                            <th>Muộn</th>
                            <th>Có phép</th>
                            <th>Vắng</th>
                            <th>Tỷ lệ có mặt</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${classStats.map(stat => {
            const classPresent = stat.onTime + stat.late;
            const classRate = stat.totalRecords > 0
                ? ((classPresent / stat.totalRecords) * 100).toFixed(1)
                : 0;

            return `
                                <tr onclick="viewClassDetail(${stat.classId})" style="cursor: pointer;">
                                    <td><strong>${stat.classCode}</strong></td>
                                    <td>${stat.className}</td>
                                    <td>${stat.students}</td>
                                    <td>${stat.sessions}</td>
                                    <td><span style="color: #10b981; font-weight: 600;">${stat.onTime}</span></td>
                                    <td><span style="color: #f59e0b; font-weight: 600;">${stat.late}</span></td>
                                    <td><span style="color: #06b6d4; font-weight: 600;">${stat.excused}</span></td>
                                    <td><span style="color: #ef4444; font-weight: 600;">${stat.absent}</span></td>
                                    <td>
                                        <strong style="color: ${classRate >= 80 ? '#10b981' : classRate >= 60 ? '#f59e0b' : '#ef4444'};">
                                            ${classRate}%
                                        </strong>
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>

            ${totalStats.attendanceRecords === 0 ? `
                <div class="alert alert-info" style="margin-top: 24px;">
                    <i class="fas fa-info-circle"></i>
                    <span>Chưa có dữ liệu điểm danh. Các lớp chưa tiến hành điểm danh.</span>
                </div>
            ` : ''}
        `;

    } catch (error) {
        console.error('Error rendering CM attendance stats:', error);
        container.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>Không thể tải thống kê điểm danh: ${error.message}</span>
            </div>
        `;
    }
}

// ===== UTILITIES =====
function openModal(modalId) {
    const m = document.getElementById(modalId);
    if (!m) return;
    m.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (!m) return;
    m.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function switchTab(event, tabId) {
    const tabs = event.target.closest('.tabs');
    if (!tabs) return;
    tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    const modalBody = event.target.closest('.modal-body');
    modalBody.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

window.onclick = function (event) {
    if (event.target.classList && event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'info' ? 'info-circle' : 'exclamation-circle'}"></i> <span>${message}</span>`;

    const container = document.querySelector('.main-content') || document.body;
    container.insertBefore(alertDiv, container.firstChild);

    setTimeout(() => alertDiv.remove(), 5000);
}

function showLoading() {
    const l = document.getElementById('loadingOverlay');
    if (l) l.classList.add('active');
}

function hideLoading() {
    const l = document.getElementById('loadingOverlay');
    if (l) l.classList.remove('active');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN');
    } catch (e) {
        return dateStr;
    }
}

function getInitials(name) {
    if (!name) return '';
    return name.split(' ').slice(-2).map(n => n[0]).join('').toUpperCase();
}

function getWeekdayName(day) {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return typeof day === 'number' ? days[day] : (days[parseInt(day)] || '');
}

function generateDefaultSessions(startDate, weekDay, total = 15) {
    const sessions = [];
    if (!startDate) {
        let base = new Date();
        for (let i = 0; i < total; i++) {
            const d = new Date(base);
            d.setDate(base.getDate() + i * 7);
            sessions.push({ number: i + 1, date: d.toISOString().slice(0, 10) });
        }
        return sessions;
    }
    const start = new Date(startDate);
    const target = parseInt(weekDay);
    let first = new Date(start);
    if (!isNaN(target) && target >= 0 && target <= 6) {
        while (first.getDay() !== target) first.setDate(first.getDate() + 1);
    }
    for (let i = 0; i < total; i++) {
        const d = new Date(first);
        d.setDate(first.getDate() + i * 7);
        sessions.push({ number: i + 1, date: d.toISOString().slice(0, 10) });
    }
    return sessions;
}

function previewSessions() {
    const startDate = document.getElementById('classStartDate').value;
    const weekDay = document.getElementById('classWeekDay').value;
    const total = 15;
    const preview = document.getElementById('sessionsPreview');
    if (!preview) return;
    if (!startDate || weekDay === '') {
        preview.style.display = 'none';
        return;
    }
    const sessions = generateDefaultSessions(startDate, parseInt(weekDay), total);
    preview.style.display = 'block';
    preview.innerHTML = `<strong>15 buổi (ví dụ) — Bắt đầu: ${formatDate(startDate)} — Buổi 1: ${formatDate(sessions[0].date)}</strong>`;
}

async function exportCMs() {
    try {
        showLoading();
        const wb = XLSX.utils.book_new();
        const data = cms.map(cm => ({
            'Mã CM': cm.code, 'Họ & tên': cm.name, 'Email': cm.email, 'SĐT': cm.phone,
            'Số lớp': classes.filter(c => c.cmId === cm.id).length, 'Trạng thái': cm.active ? 'Hoạt động' : 'Tạm dừng'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'CMs');
        const ts = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `Danh_sach_CM_${ts}.xlsx`);
        hideLoading();
        showAlert('success', 'Export thành công');
    } catch (err) {
        hideLoading();
        console.error('exportCMs error', err);
        showAlert('error', 'Không thể export');
    }
}

function quickLogin(role) {
    const user = CONFIG.DEMO_USERS[role];
    if (!user) return;
    document.getElementById('loginEmail').value = user.email;
    document.getElementById('loginPassword').value = user.password;
    login();
}

// ===== EXPOSE ALL FUNCTIONS TO WINDOW =====
window.viewClassDetail = viewClassDetail;
window.editClass = editClass;
window.deleteClass = deleteClass;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.editTeacher = editTeacher;
window.deleteTeacher = deleteTeacher;
window.editCM = editCM;
window.deleteCM = deleteCM;
window.viewCMDetail = viewCMDetail;
window.openAddClassModal = openAddClassModal;
window.openAddStudentModal = openAddStudentModal;
window.openAddTeacherModal = openAddTeacherModal;
window.openAddCMModal = openAddCMModal;
window.showDashboard = showDashboard;
window.showClasses = showClasses;
window.showStudents = showStudents;
window.showTeachers = showTeachers;
window.showCMs = showCMs;
window.quickLogin = quickLogin;
window.logout = logout;
window.login = login;
window.saveClass = saveClass;
window.saveStudent = saveStudent;
window.saveTeacher = saveTeacher;
window.saveCM = saveCM;
window.saveAttendance = saveAttendance;
window.setAttendance = setAttendance;
window.selectSession = selectSession;
window.switchTab = switchTab;
window.previewSessions = previewSessions;
window.exportCMs = exportCMs;

console.log('✅ App.js refactored - loaded successfully');
console.log('✅ All CRUD functions exposed to window');
console.log('✅ Role system: 0=Admin, 1=Teacher, 2=CM');