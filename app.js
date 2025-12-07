// ===== MAIN APPLICATION =====
// ===== MAIN APPLICATION =====

// Global State
let currentUser = null;
let classes = [];
let students = [];
let teachers = [];
let currentClassId = null;
let currentSession = 1;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
});

// ===== AUTHENTICATION =====
function checkSession() {
    const savedUser = localStorage.getItem(CONFIG.SESSION_KEY);
    if (savedUser) {
        const userData = JSON.parse(savedUser);
        const sessionTime = Date.now() - userData.timestamp;

        if (sessionTime < CONFIG.SESSION_TIMEOUT) {
            currentUser = userData;
            showPage('mainApp');
            updateUserUI();
            loadDashboard();
        } else {
            localStorage.removeItem(CONFIG.SESSION_KEY);
            showPage('loginPage');
        }
    } else {
        showPage('loginPage');
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showLoginAlert('error', 'Vui lòng nhập đầy đủ email và mật khẩu');
        return;
    }

    // Check demo users
    const demoUser = Object.values(CONFIG.DEMO_USERS).find(
        u => u.email === email && u.password === password
    );

    if (demoUser) {
        currentUser = {
            ...demoUser,
            timestamp: Date.now()
        };

        localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(currentUser));
        showPage('mainApp');
        updateUserUI();
        await loadDashboard();
        showLoginAlert('success', 'Đăng nhập thành công!');
    } else {
        showLoginAlert('error', 'Email hoặc mật khẩu không đúng');
    }
}

function quickLogin(role) {
    const user = CONFIG.DEMO_USERS[role];
    document.getElementById('loginEmail').value = user.email;
    document.getElementById('loginPassword').value = user.password;
    login();
}

function logout() {
    localStorage.removeItem(CONFIG.SESSION_KEY);
    currentUser = null;
    showPage('loginPage');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
}

function updateUserUI() {
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userAvatar').textContent = currentUser.avatar;
    document.getElementById('userRole').className = `badge badge-${currentUser.role}`;
    document.getElementById('userRole').textContent =
        currentUser.role === 'admin' ? 'Admin' :
            currentUser.role === 'teacher' ? 'Giáo viên' : 'Class Manager';
}

function showLoginAlert(type, message) {
    const alertDiv = document.getElementById('loginAlert');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    alertDiv.style.display = 'flex';

    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 3000);
}

// ===== NAVIGATION =====
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

function showContent(contentId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(contentId).classList.add('active');

    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
}

async function showDashboard() {
    showContent('dashboardContent');
    document.querySelector('.sidebar-menu a').classList.add('active');
    await loadDashboard();
}

async function showClasses() {
    showContent('classesContent');
    document.querySelectorAll('.sidebar-menu a')[1].classList.add('active');
    await loadClasses();
}

async function showStudents() {
    showContent('studentsContent');
    document.querySelectorAll('.sidebar-menu a')[2].classList.add('active');
    await loadStudents();
}

async function showTeachers() {
    showContent('teachersContent');
    document.querySelectorAll('.sidebar-menu a')[3].classList.add('active');
    await loadTeachers();
}

// ===== DASHBOARD =====
async function loadDashboard() {
    try {
        // Load all data
        classes = await API.getClasses();
        students = await API.getStudents();
        teachers = await API.getTeachers();

        console.log('Dashboard loaded:', {
            classes: classes.length,
            students: students.length,
            teachers: teachers.length
        });

        // Filter based on role
        let filteredClasses = classes;
        if (currentUser.role === 'teacher') {
            filteredClasses = classes.filter(c => c.teacherId === currentUser.teacherId);
        } else if (currentUser.role === 'cm') {
            filteredClasses = classes.filter(c => c.cmId === currentUser.cmId);
        }

        // Update stats
        document.getElementById('totalClasses').textContent = filteredClasses.length;
        document.getElementById('totalStudents').textContent = students.length;
        document.getElementById('totalTeachers').textContent = teachers.length;

        // Render recent classes
        renderClassCards(filteredClasses.slice(0, 3), 'dashboardClasses');
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showAlert('error', 'Không thể tải dữ liệu dashboard');
    }
}

// ===== CLASSES =====
async function loadClasses() {
    try {
        classes = await API.getClasses();

        console.log('Classes loaded:', classes);

        let filteredClasses = classes;
        if (currentUser.role === 'teacher') {
            filteredClasses = classes.filter(c => c.teacherId === currentUser.teacherId);
        } else if (currentUser.role === 'cm') {
            filteredClasses = classes.filter(c => c.cmId === currentUser.cmId);
        }

        console.log('Filtered classes:', filteredClasses);

        renderClassCards(filteredClasses, 'classesGrid');
    } catch (error) {
        console.error('Error loading classes:', error);
        showAlert('error', 'Không thể tải danh sách lớp học');
    }
}

function renderClassCards(classList, containerId) {
    const container = document.getElementById(containerId);

    console.log('Rendering classes to', containerId, ':', classList);

    if (!container) {
        console.error('Container not found:', containerId);
        return;
    }

    if (!classList || classList.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-light);">
                <i class="fas fa-inbox" style="font-size: 64px; margin-bottom: 16px; opacity: 0.5;"></i>
                <h3 style="font-size: 20px; margin-bottom: 8px;">Không có lớp học</h3>
                <p>Chưa có lớp học nào. ${currentUser.role === 'admin' ? 'Nhấn "Thêm lớp" để tạo mới.' : ''}</p>
            </div>
        `;
        return;
    }

    const html = classList.map(cls => `
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
                        <i class="fas fa-user-shield"></i>
                        <span>CM: ${cls.cm || 'Chưa có'}</span>
                    </div>
                    <div class="card-info-item">
                        <i class="fas fa-users"></i>
                        <span>${cls.students || 0} học sinh</span>
                    </div>
                    <div class="card-info-item">
                        <i class="fas fa-calendar"></i>
                        <span>${formatDate(cls.start)} - ${formatDate(cls.end)}</span>
                    </div>
                    <div class="card-info-item">
                        <i class="fas fa-clock"></i>
                        <span>${cls.schedule || 'Chưa có lịch'}</span>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary" style="flex:1" onclick="event.stopPropagation(); viewClassDetail(${cls.id})">
                        <i class="fas fa-eye"></i> Chi tiết
                    </button>
                    ${currentUser.role === 'admin' ? `
                        <button class="action-btn edit" onclick="event.stopPropagation(); editClass(${cls.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="event.stopPropagation(); deleteClass(${cls.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

async function viewClassDetail(classId) {
    try {
        currentClassId = classId;
        const cls = classes.find(c => c.id === classId);

        console.log('View class detail:', classId, cls);

        if (!cls) {
            showAlert('error', 'Không tìm thấy lớp học');
            return;
        }

        // Render class header
        document.getElementById('classDetailHeader').innerHTML = `
            <h3>${cls.name}</h3>
            <p style="opacity: 0.9; margin-bottom: 8px;">Mã lớp: ${cls.code}</p>
            <div class="class-info-grid">
                <div class="class-info-box"><label>Giáo viên</label><strong>${cls.teacher}</strong></div>
                <div class="class-info-box"><label>Class Manager</label><strong>${cls.cm}</strong></div>
                <div class="class-info-box"><label>Số học sinh</label><strong>${cls.students}</strong></div>
                <div class="class-info-box"><label>Thời gian</label><strong>${formatDate(cls.start)} - ${formatDate(cls.end)}</strong></div>
                <div class="class-info-box"><label>Lịch học</label><strong>${cls.schedule}</strong></div>
                <div class="class-info-box"><label>Số buổi</label><strong>${cls.sessions} buổi</strong></div>
            </div>
        `;

        // Load students
        await renderClassStudents(classId);
        renderSessionsGrid(cls.sessions);
        await renderCommentsTab(classId);

        openModal('classDetailModal');
    } catch (error) {
        console.error('Error viewing class detail:', error);
        showAlert('error', 'Không thể xem chi tiết lớp học');
    }
}

async function renderClassStudents(classId) {
    const classStudents = students.filter(s => s.classId === classId);
    const container = document.getElementById('classStudentsList');

    if (classStudents.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--text-light);">Chưa có học sinh</p>';
        return;
    }

    // Load all attendance for this class to calculate stats
    const cls = classes.find(c => c.id === classId);
    const attendanceStats = {};

    // Initialize stats for each student
    classStudents.forEach(s => {
        attendanceStats[s.id] = {
            onTime: 0,
            late: 0,
            excused: 0,
            absent: 0
        };
    });

    // Load attendance for all sessions
    try {
        for (let session = 1; session <= (cls?.sessions || 15); session++) {
            const records = await API.getAttendance(classId, session);
            records.forEach(record => {
                const studentId = parseInt(record.studentid || record.studentId);
                if (attendanceStats[studentId]) {
                    switch (record.status) {
                        case 'on-time':
                            attendanceStats[studentId].onTime++;
                            break;
                        case 'late':
                            attendanceStats[studentId].late++;
                            break;
                        case 'excused':
                            attendanceStats[studentId].excused++;
                            break;
                        case 'absent':
                            attendanceStats[studentId].absent++;
                            break;
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading attendance stats:', error);
    }

    container.innerHTML = classStudents.map(s => {
        const stats = attendanceStats[s.id] || { onTime: 0, late: 0, excused: 0, absent: 0 };
        return `
        <div class="student-item">
            <div class="student-avatar">${getInitials(s.name)}</div>
            <div class="student-info">
                <h4>${s.name}</h4>
                <p>MSSV: ${s.code} • ${s.email}</p>
            </div>
            <div class="student-stats">
                <div class="student-stat"><strong style="color: #10b981;">${stats.onTime}</strong><span>Đúng giờ</span></div>
                <div class="student-stat"><strong style="color: #f59e0b;">${stats.late}</strong><span>Muộn</span></div>
                <div class="student-stat"><strong style="color: #06b6d4;">${stats.excused}</strong><span>Có phép</span></div>
                <div class="student-stat"><strong style="color: #ef4444;">${stats.absent}</strong><span>Vắng</span></div>
            </div>
        </div>
    `}).join('');
}

async function renderSessionsGrid(totalSessions) {
    const container = document.getElementById('sessionsGrid');

    // Load attendance stats for each session
    const sessionStats = {};

    try {
        for (let i = 1; i <= totalSessions; i++) {
            const records = await API.getAttendance(currentClassId, i);
            sessionStats[i] = {
                onTime: records.filter(r => r.status === 'on-time').length,
                late: records.filter(r => r.status === 'late').length,
                excused: records.filter(r => r.status === 'excused').length,
                absent: records.filter(r => r.status === 'absent').length
            };
        }
    } catch (error) {
        console.error('Error loading session stats:', error);
    }

    let html = '';
    for (let i = 1; i <= totalSessions; i++) {
        const stats = sessionStats[i] || { onTime: 0, late: 0, excused: 0, absent: 0 };
        const hasData = stats.onTime + stats.late + stats.excused + stats.absent > 0;

        html += `
            <div class="session-card ${i === 1 ? 'active' : ''}" onclick="selectSession(${i})">
                <h4>Buổi ${i}</h4>
                <p>${hasData ? 'Đã điểm danh' : 'Chưa điểm danh'}</p>
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
    }

    container.innerHTML = html;
    await renderAttendanceTable(1);
}

// Add CSS for session stats if not already in styles.css
const sessionStatsStyle = `
.session-stats {
    display: flex;
    justify-content: space-around;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(0,0,0,0.1);
}

.session-card.active .session-stats {
    border-top-color: rgba(255,255,255,0.3);
}

.session-stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.session-stat span:first-child {
    font-size: 16px;
    font-weight: 700;
}

.session-stat span:last-child {
    font-size: 11px;
    opacity: 0.8;
}
`;

function selectSession(session) {
    currentSession = session;
    document.querySelectorAll('.session-card').forEach(card => card.classList.remove('active'));
    event.currentTarget.classList.add('active');
    renderAttendanceTable(session);
}

async function renderAttendanceTable(session) {
    const classStudents = students.filter(s => s.classId === currentClassId);
    const container = document.getElementById('attendanceTableContainer');

    // Load existing attendance data for this session
    let attendanceRecords = [];
    try {
        attendanceRecords = await API.getAttendance(currentClassId, session);
        console.log('Loaded attendance records:', attendanceRecords);
    } catch (error) {
        console.error('Error loading attendance:', error);
    }

    // Create a map for quick lookup
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
        attendanceMap[record.studentid || record.studentId] = {
            status: record.status,
            note: record.note
        };
    });

    console.log('Attendance map:', attendanceMap);

    container.innerHTML = `
        <div style="padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
            <h3>Điểm danh Buổi ${session}</h3>
            <button class="btn btn-primary" onclick="saveAttendance()">
                <i class="fas fa-save"></i> Lưu điểm danh
            </button>
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
                                <button class="status-btn on-time ${attendance.status === 'on-time' ? 'active' : ''}" onclick="setAttendance(this)">
                                    <i class="fas fa-check"></i> Đúng giờ
                                </button>
                                <button class="status-btn late ${attendance.status === 'late' ? 'active' : ''}" onclick="setAttendance(this)">
                                    <i class="fas fa-clock"></i> Muộn
                                </button>
                                <button class="status-btn excused ${attendance.status === 'excused' ? 'active' : ''}" onclick="setAttendance(this)">
                                    <i class="fas fa-file-alt"></i> Có phép
                                </button>
                                <button class="status-btn absent ${attendance.status === 'absent' ? 'active' : ''}" onclick="setAttendance(this)">
                                    <i class="fas fa-times"></i> Vắng
                                </button>
                            </div>
                        </td>
                        <td><input type="text" class="note-input" placeholder="Ghi chú..." value="${attendance.note || ''}" data-student-id="${s.id}"></td>
                    </tr>
                `}).join('')}
            </tbody>
        </table>
    `;
}

function setAttendance(btn) {
    btn.closest('tr').querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

async function saveAttendance() {
    try {
        const records = [];
        const rows = document.querySelectorAll('#attendanceTableContainer tbody tr');

        rows.forEach(row => {
            const activeBtn = row.querySelector('.status-btn.active');
            const noteInput = row.querySelector('.note-input');
            const studentId = noteInput.dataset.studentId;

            if (activeBtn) {
                const status = activeBtn.classList.contains('on-time') ? 'on-time' :
                    activeBtn.classList.contains('late') ? 'late' :
                        activeBtn.classList.contains('excused') ? 'excused' : 'absent';

                records.push({
                    studentId: parseInt(studentId),
                    status,
                    note: noteInput.value
                });
            }
        });

        await API.saveAttendance(currentClassId, currentSession, records);
        showAlert('success', 'Đã lưu điểm danh thành công!');
    } catch (error) {
        console.error('Error saving attendance:', error);
        showAlert('error', 'Không thể lưu điểm danh');
    }
}

async function renderCommentsTab(classId) {
    const classStudents = students.filter(s => s.classId === classId);
    const container = document.getElementById('commentsStudentsList');

    // Load existing comments
    let existingComments = {};
    try {
        existingComments = await API.getComments(classId);
        console.log('Loaded comments:', existingComments);
    } catch (error) {
        console.error('Error loading comments:', error);
    }

    container.innerHTML = classStudents.map(s => `
        <div class="student-item" style="flex-direction: column; align-items: flex-start;">
            <div style="display: flex; align-items: center; gap: 16px; width: 100%; margin-bottom: 16px;">
                <div class="student-avatar">${getInitials(s.name)}</div>
                <div class="student-info">
                    <h4>${s.name}</h4>
                    <p>MSSV: ${s.code}</p>
                </div>
            </div>
            <textarea class="note-input" rows="3" placeholder="Nhận xét về học sinh..." data-student-id="${s.id}">${existingComments[s.id] || ''}</textarea>
        </div>
    `).join('');
}

async function saveComments() {
    try {
        const comments = {};
        document.querySelectorAll('#commentsStudentsList textarea').forEach(textarea => {
            const studentId = textarea.dataset.studentId;
            comments[studentId] = textarea.value;
        });

        await API.saveComments(currentClassId, comments);
        showAlert('success', 'Đã lưu nhận xét thành công!');
    } catch (error) {
        console.error('Error saving comments:', error);
        showAlert('error', 'Không thể lưu nhận xét');
    }
}

function openAddClassModal() {
    document.getElementById('classModalTitle').innerHTML = '<i class="fas fa-plus"></i> Thêm lớp học';
    document.getElementById('classId').value = '';
    document.getElementById('className').value = '';
    document.getElementById('classCode').value = '';
    document.getElementById('classStart').value = '';
    document.getElementById('classEnd').value = '';
    document.getElementById('classSchedule').value = '';
    document.getElementById('classSessions').value = '15';
    populateTeachersSelect();
    populateCMSelect();
    openModal('classModal');
}

async function editClass(classId) {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;

    document.getElementById('classModalTitle').innerHTML = '<i class="fas fa-edit"></i> Chỉnh sửa lớp học';
    document.getElementById('classId').value = cls.id;
    document.getElementById('className').value = cls.name;
    document.getElementById('classCode').value = cls.code;
    document.getElementById('classStart').value = cls.start;
    document.getElementById('classEnd').value = cls.end;
    document.getElementById('classSchedule').value = cls.schedule;
    document.getElementById('classSessions').value = cls.sessions;
    await populateTeachersSelect();
    await populateCMSelect();
    document.getElementById('classTeacher').value = cls.teacherId;
    document.getElementById('classCM').value = cls.cmId;
    openModal('classModal');
}

async function saveClass() {
    try {
        const id = document.getElementById('classId').value;
        const name = document.getElementById('className').value.trim();
        const code = document.getElementById('classCode').value.trim();

        if (!name || !code) {
            showAlert('error', 'Vui lòng nhập đầy đủ thông tin bắt buộc');
            return;
        }

        const teacherId = parseInt(document.getElementById('classTeacher').value) || 0;
        const cmId = parseInt(document.getElementById('classCM').value) || 0;
        const teacher = teachers.find(t => t.id === teacherId);
        const cm = teachers.find(t => t.id === cmId);

        const classData = {
            name,
            code,
            teacherId,
            teacher: teacher ? teacher.name : '',
            cmId,
            cm: cm ? cm.name : '',
            start: document.getElementById('classStart').value,
            end: document.getElementById('classEnd').value,
            schedule: document.getElementById('classSchedule').value.trim(),
            sessions: parseInt(document.getElementById('classSessions').value) || 15,
            students: 0,
            color: CONFIG.CARD_COLORS[Math.floor(Math.random() * CONFIG.CARD_COLORS.length)]
        };

        console.log('Saving class:', classData);

        if (id) {
            classData.id = parseInt(id);
            await API.updateClass(parseInt(id), classData);
            showAlert('success', 'Đã cập nhật lớp học thành công!');
        } else {
            const newClass = await API.createClass(classData);
            console.log('Class created:', newClass);
            showAlert('success', 'Đã thêm lớp học mới thành công!');
        }

        closeModal('classModal');
        await loadClasses();
        await loadDashboard();
    } catch (error) {
        console.error('Error saving class:', error);
        showAlert('error', 'Có lỗi xảy ra khi lưu lớp học');
    }
}

async function deleteClass(classId) {
    if (!confirm('Bạn có chắc muốn xóa lớp học này?')) return;

    try {
        await API.deleteClass(classId);
        showAlert('success', 'Đã xóa lớp học thành công!');
        await loadClasses();
        await loadDashboard();
    } catch (error) {
        console.error('Error deleting class:', error);
        showAlert('error', 'Có lỗi xảy ra khi xóa lớp học');
    }
}

async function populateTeachersSelect() {
    if (teachers.length === 0) {
        teachers = await API.getTeachers();
    }
    const html = '<option value="">Chọn giáo viên</option>' +
        teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    document.getElementById('classTeacher').innerHTML = html;
}

async function populateCMSelect() {
    if (teachers.length === 0) {
        teachers = await API.getTeachers();
    }
    const html = '<option value="">Chọn CM</option>' +
        teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    document.getElementById('classCM').innerHTML = html;
}

// ===== STUDENTS =====
async function loadStudents() {
    try {
        students = await API.getStudents();
        // Reload classes to populate select
        if (classes.length === 0) {
            classes = await API.getClasses();
        }
        renderStudentsTable();
    } catch (error) {
        console.error('Error loading students:', error);
        showAlert('error', 'Không thể tải danh sách học sinh');
    }
}

function renderStudentsTable() {
    const tbody = document.getElementById('studentsTable');

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px;">Chưa có học sinh</td></tr>';
        return;
    }

    tbody.innerHTML = students.map(s => `
        <tr>
            <td>${s.code}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="avatar" style="width: 36px; height: 36px; font-size: 14px;">${getInitials(s.name)}</div>
                    <span>${s.name}</span>
                </div>
            </td>
            <td>${s.email}</td>
            <td>${s.phone}</td>
            <td>${s.className}</td>
            <td>
                <button class="action-btn edit" onclick="editStudent(${s.id})"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" onclick="deleteStudent(${s.id})"><i class="fas fa-trash"></i></button>
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
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    document.getElementById('studentModalTitle').innerHTML = '<i class="fas fa-edit"></i> Chỉnh sửa học sinh';
    document.getElementById('studentId').value = student.id;
    document.getElementById('studentCode').value = student.code;
    document.getElementById('studentName').value = student.name;
    document.getElementById('studentEmail').value = student.email;
    document.getElementById('studentPhone').value = student.phone;
    await populateClassesSelect();
    document.getElementById('studentClass').value = student.classId;
    openModal('studentModal');
}

async function saveStudent() {
    try {
        const id = document.getElementById('studentId').value;
        const code = document.getElementById('studentCode').value.trim();
        const name = document.getElementById('studentName').value.trim();

        if (!code || !name) {
            showAlert('error', 'Vui lòng nhập đầy đủ thông tin bắt buộc');
            return;
        }

        const classId = parseInt(document.getElementById('studentClass').value) || 0;
        const cls = classes.find(c => c.id === classId);

        const studentData = {
            code,
            name,
            email: document.getElementById('studentEmail').value.trim(),
            phone: document.getElementById('studentPhone').value.trim(),
            classId,
            className: cls ? cls.code : ''
        };

        if (id) {
            studentData.id = parseInt(id);
            await API.updateStudent(parseInt(id), studentData);
            showAlert('success', 'Đã cập nhật học sinh thành công!');
        } else {
            await API.createStudent(studentData);
            showAlert('success', 'Đã thêm học sinh mới thành công!');
        }

        closeModal('studentModal');
        await loadStudents();
        await loadDashboard();
    } catch (error) {
        console.error('Error saving student:', error);
        showAlert('error', 'Có lỗi xảy ra khi lưu học sinh');
    }
}

async function deleteStudent(studentId) {
    if (!confirm('Bạn có chắc muốn xóa học sinh này?')) return;

    try {
        await API.deleteStudent(studentId);
        showAlert('success', 'Đã xóa học sinh thành công!');
        await loadStudents();
        await loadDashboard();
    } catch (error) {
        console.error('Error deleting student:', error);
        showAlert('error', 'Có lỗi xảy ra khi xóa học sinh');
    }
}

async function populateClassesSelect() {
    if (classes.length === 0) {
        classes = await API.getClasses();
    }

    console.log('Populating classes select:', classes);

    const html = '<option value="">Chọn lớp học</option>' +
        classes.map(c => `<option value="${c.id}">${c.code} - ${c.name}</option>`).join('');
    document.getElementById('studentClass').innerHTML = html;
}


// ===== TEACHERS =====
async function loadTeachers() {
    try {
        teachers = await API.getTeachers();
        renderTeachersTable();
    } catch (error) {
        console.error('Error loading teachers:', error);
    }
}

function renderTeachersTable() {
    const tbody = document.getElementById('teachersTable');

    if (teachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 40px;">Chưa có giáo viên</td></tr>';
        return;
    }

    tbody.innerHTML = teachers.map(t => `
        <tr>
            <td>${t.code}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="avatar" style="width: 36px; height: 36px; font-size: 14px;">${getInitials(t.name)}</div>
                    <span>${t.name}</span>
                </div>
            </td>
            <td>${t.email}</td>
            <td>${t.phone}</td>
            <td>${t.subject}</td>
            <td><span class="status ${t.active ? 'status-active' : 'status-pending'}">${t.active ? 'Hoạt động' : 'Tạm dừng'}</span></td>
            <td>
                <button class="action-btn edit" onclick="editTeacher(${t.id})"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" onclick="deleteTeacher(${t.id})"><i class="fas fa-trash"></i></button>
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
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    document.getElementById('teacherModalTitle').innerHTML = '<i class="fas fa-edit"></i> Chỉnh sửa giáo viên';
    document.getElementById('teacherId').value = teacher.id;
    document.getElementById('teacherCode').value = teacher.code;
    document.getElementById('teacherName').value = teacher.name;
    document.getElementById('teacherEmail').value = teacher.email;
    document.getElementById('teacherPhone').value = teacher.phone;
    document.getElementById('teacherSubject').value = teacher.subject;
    openModal('teacherModal');
}

async function saveTeacher() {
    try {
        const id = document.getElementById('teacherId').value;
        const code = document.getElementById('teacherCode').value.trim();
        const name = document.getElementById('teacherName').value.trim();

        if (!code || !name) {
            showAlert('error', 'Vui lòng nhập đầy đủ thông tin bắt buộc');
            return;
        }

        const teacherData = {
            code,
            name,
            email: document.getElementById('teacherEmail').value.trim(),
            phone: document.getElementById('teacherPhone').value.trim(),
            subject: document.getElementById('teacherSubject').value.trim(),
            active: true
        };

        if (id) {
            await API.updateTeacher(parseInt(id), teacherData);
            showAlert('success', 'Đã cập nhật giáo viên thành công!');
        } else {
            await API.createTeacher(teacherData);
            showAlert('success', 'Đã thêm giáo viên mới thành công!');
        }

        closeModal('teacherModal');
        await loadTeachers();
        await loadDashboard();
    } catch (error) {
        console.error('Error saving teacher:', error);
        showAlert('error', 'Có lỗi xảy ra khi lưu giáo viên');
    }
}

async function deleteTeacher(teacherId) {
    if (!confirm('Bạn có chắc muốn xóa giáo viên này?')) return;

    try {
        await API.deleteTeacher(teacherId);
        showAlert('success', 'Đã xóa giáo viên thành công!');
        await loadTeachers();
        await loadDashboard();
    } catch (error) {
        console.error('Error deleting teacher:', error);
        showAlert('error', 'Có lỗi xảy ra khi xóa giáo viên');
    }
}

// ===== MODAL FUNCTIONS =====
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = 'auto';
}

function switchTab(event, tabId) {
    const tabsContainer = event.target.closest('.tabs');
    tabsContainer.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    const modalBody = event.target.closest('.modal-body');
    modalBody.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

// Close modal on outside click
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// ===== HELPER FUNCTIONS =====
function getInitials(name) {
    return name.split(' ').slice(-2).map(n => n[0]).join('').toUpperCase();
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
}