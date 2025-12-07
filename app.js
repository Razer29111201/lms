// app.js - Phiên bản "MỚI" (startDate, weekDay, timeSlot, CM từ CMAPI)
// Ghi chú: các hàm có comment tiếng Việt, mô tả nhiệm vụ từng đoạn giúp bảo trì dễ dàng.

// ===== GLOBAL STATE =====
let currentUser = null;       // thông tin user hiện tại (từ session)
let classes = [];             // danh sách lớp
let students = [];            // danh sách học sinh
let teachers = [];            // danh sách giáo viên
let cms = [];                 // danh sách class managers (CM)
let currentClassId = null;    // id lớp đang xem
let currentSessionDate = null;// ngày buổi học đang chọn (string)
let currentSessionNumber = 1; // số buổi hiện tại (nếu cần hiển thị)
let sessionCache = {};        // cache sessions theo class để tránh gọi API nhiều lần

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
});

// ===== AUTHENTICATION & SESSION =====
// Kiểm tra session lưu trong localStorage (CONFIG.SESSION_KEY)
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
            // Load dashboard data
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

// Login demo or real
async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) {
        showLoginAlert('error', 'Vui lòng nhập email và mật khẩu');
        return;
    }

    // Demo users fallback
    const demoUser = Object.values(CONFIG.DEMO_USERS || {}).find(u => u.email === email && u.password === password);
    if (demoUser) {
        currentUser = { ...demoUser, timestamp: Date.now() };
        localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(currentUser));
        showPage('mainApp');
        updateUserUI();
        await loadDashboard();
        showLoginAlert('success', 'Đăng nhập thành công');
        return;
    }

    // TODO: nếu bạn có API auth thực, gọi API ở đây
    showLoginAlert('error', 'Email hoặc mật khẩu không đúng');
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
    // set sidebar active (simple)
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
}

// ===== USER UI =====
function updateUserUI() {
    if (!currentUser) return;
    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    const roleEl = document.getElementById('userRole');
    if (nameEl) nameEl.textContent = currentUser.name || '';
    if (avatarEl) avatarEl.textContent = (currentUser.avatar || '').slice(0, 1).toUpperCase();
    if (roleEl) {
        roleEl.className = `badge badge-${currentUser.role || 'default'}`;
        roleEl.textContent = currentUser.role === 'admin' ? 'Admin' : (currentUser.role === 'teacher' ? 'Giáo viên' : 'Class Manager');
    }
}

// ===== DASHBOARD / LOADING DATA =====
async function loadDashboard() {
    try {
        showLoading();
        // Load all base data
        [classes, students, teachers, cms] = await Promise.all([
            API.getClasses(),
            API.getStudents(),
            API.getTeachers(),
            CMAPI.getAll()
        ]);

        // Update dashboard stats
        let filteredClasses = classes;
        if (currentUser?.role === 'teacher') {
            filteredClasses = classes.filter(c => c.teacherId === currentUser.teacherId);
        } else if (currentUser?.role === 'cm') {
            filteredClasses = classes.filter(c => c.cmId === currentUser.cmId);
        }

        document.getElementById('totalClasses').textContent = filteredClasses.length;
        document.getElementById('totalStudents').textContent = students.length;
        document.getElementById('totalTeachers').textContent = teachers.length;

        // Render a few class cards
        renderClassCards(filteredClasses.slice(0, 3), 'dashboardClasses');
        hideLoading();
    } catch (err) {
        hideLoading();
        console.error('loadDashboard error', err);
        showAlert('error', 'Không thể tải dashboard');
    }
}

// ===== CLASSES =====
// Load and render classes (classesContent)
async function loadClasses() {
    try {
        showContent('classesContent');
        classes = await API.getClasses();
        // filter by role
        let filtered = classes;
        if (currentUser.role === 'teacher') filtered = classes.filter(c => c.teacherId === currentUser.teacherId);
        else if (currentUser.role === 'cm') filtered = classes.filter(c => c.cmId === currentUser.cmId);
        renderClassCards(filtered, 'classesGrid');
    } catch (err) {
        console.error('loadClasses error', err);
        showAlert('error', 'Không thể tải danh sách lớp');
    }
}

// Render class cards into containerId
function renderClassCards(classList, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!classList || classList.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-light);">
            <i class="fas fa-inbox" style="font-size:48px;opacity:0.4"></i>
            <h3>Không có lớp học</h3>
            <p>${currentUser?.role === 'admin' ? 'Nhấn "Thêm lớp" để tạo mới.' : ''}</p>
        </div>`;
        return;
    }

    const html = classList.map(cls => {
        const weekday = getWeekdayName(cls.weekDay);
        return `
        <div class="class-card" onclick="viewClassDetail(${cls.id})">
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
                    <button class="btn btn-primary" style="flex:1" onclick="event.stopPropagation(); viewClassDetail(${cls.id})">
                        <i class="fas fa-eye"></i> Chi tiết
                    </button>
                    ${currentUser?.role === 'admin' ? `
                        <button class="action-btn edit" onclick="event.stopPropagation(); editClass(${cls.id})"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" onclick="event.stopPropagation(); deleteClass(${cls.id})"><i class="fas fa-trash"></i></button>
                    ` : ''}
                </div>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = html;
}

// Mở modal thêm lớp (đặt form rỗng)
function openAddClassModal() {
    document.getElementById('classModalTitle').innerHTML = '<i class="fas fa-plus"></i> Thêm lớp học';
    document.getElementById('classId').value = '';
    document.getElementById('className').value = '';
    document.getElementById('classCode').value = '';
    document.getElementById('classStartDate').value = '';
    document.getElementById('classWeekDay').value = '';
    document.getElementById('classTimeSlot').value = '';
    document.getElementById('sessionsPreview').style.display = 'none';

    // Populate selects
    populateTeachersSelect();
    populateCMSelect();
    openModal('classModal');
}

// Chỉnh sửa lớp: set giá trị vào form, đặc biệt set đúng ID cho classCM
async function editClass(classId) {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;

    document.getElementById('classModalTitle').innerHTML = '<i class="fas fa-edit"></i> Chỉnh sửa lớp học';
    document.getElementById('classId').value = cls.id;
    document.getElementById('className').value = cls.name || '';
    document.getElementById('classCode').value = cls.code || '';
    document.getElementById('classStartDate').value = cls.startDate || '';
    document.getElementById('classWeekDay').value = cls.weekDay != null ? cls.weekDay : '';
    document.getElementById('classTimeSlot').value = cls.timeSlot || '';

    // Load selects trước, sau đó set value theo ID
    await populateTeachersSelect();
    await populateCMSelect();

    // Set selected teacher id (nếu có)
    if (cls.teacherId) {
        const teacherEl = document.getElementById('classTeacher');
        if (teacherEl) teacherEl.value = cls.teacherId;
    }

    // Set selected CM id (nếu có) — Sửa quan trọng: lưu ID, không phải tên
    if (cls.cmId) {
        const cmEl = document.getElementById('classCM');
        if (cmEl) cmEl.value = cls.cmId;
    }

    // Hiển thị preview số buổi nếu cần
    previewSessions();
    openModal('classModal');
}

// Lưu lớp (tạo mới hoặc cập nhật)
// LƯU Ý: lưu teacherId và cmId dưới dạng ID; server / API sẽ lưu tên nếu cần
async function saveClass() {
    try {
        const id = document.getElementById('classId').value;
        const name = document.getElementById('className').value.trim();
        const code = document.getElementById('classCode').value.trim();
        const startDate = document.getElementById('classStartDate').value;
        const weekDay = document.getElementById('classWeekDay').value;
        const timeSlot = document.getElementById('classTimeSlot').value.trim();

        // Basic validation
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
            totalSessions: 15 // mặc định 15 buổi (hoặc có thể tuỳ chỉnh)
        };

        if (id) {
            payload.id = parseInt(id);
            await API.updateClass(parseInt(id), payload);
            showAlert('success', 'Đã cập nhật lớp học thành công!');
        } else {
            const newClass = await API.createClass(payload);
            // server có thể trả về object mới
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
    if (!confirm('Bạn có chắc muốn xóa lớp học này?')) return;
    try {
        await API.deleteClass(classId);
        showAlert('success', 'Đã xóa lớp học');
        await loadClasses();
        await loadDashboard();
    } catch (err) {
        console.error('deleteClass error', err);
        showAlert('error', 'Không thể xóa lớp');
    }
}

// ===== POPULATE SELECTS =====
// Nạp danh sách giáo viên vào select #classTeacher
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

// Nạp danh sách CM (từ CMAPI) vào select #classCM
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

// ===== CLASS DETAIL & SESSIONS =====
async function viewClassDetail(classId) {
    try {
        currentClassId = classId;
        const cls = classes.find(c => c.id === classId);
        if (!cls) { showAlert('error', 'Không tìm thấy lớp'); return; }

        // Header
        document.getElementById('classDetailHeader').innerHTML = `
            <h3>${cls.name}</h3>
            <p style="opacity:0.9;margin-bottom:8px">Mã lớp: ${cls.code}</p>
            <div class="class-info-grid">
                <div class="class-info-box"><label>Giáo viên</label><strong>${cls.teacher}</strong></div>
                <div class="class-info-box"><label>Class Manager</label><strong>${cls.cm}</strong></div>
                <div class="class-info-box"><label>Số học sinh</label><strong>${cls.students || 0}</strong></div>
                <div class="class-info-box"><label>Bắt đầu</label><strong>${formatDate(cls.startDate)}</strong></div>
                <div class="class-info-box"><label>Buổi học</label><strong>${cls.totalSessions || 15} buổi</strong></div>
            </div>
        `;

        // Render students + sessions
        await renderClassStudents(classId);
        await renderSessionsGrid(classId);

        openModal('classDetailModal');
    } catch (err) {
        console.error('viewClassDetail error', err);
        showAlert('error', 'Không thể mở chi tiết lớp');
    }
}

// Render danh sách học sinh trong 1 lớp
async function renderClassStudents(classId) {
    const list = students.filter(s => s.classId === classId);
    const container = document.getElementById('classStudentsList');
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-light)">Chưa có học sinh</p>';
        return;
    }

    // Tính toán thống kê điểm danh (nếu muốn) — đơn giản: hiển thị danh sách
    container.innerHTML = list.map(s => `
        <div class="student-item">
            <div class="student-avatar">${getInitials(s.name)}</div>
            <div class="student-info">
                <h4>${s.name}</h4>
                <p>MSSV: ${s.code} • ${s.email || ''}</p>
            </div>
        </div>
    `).join('');
}

// Render sessions grid: lấy sessions từ API hoặc tạo mặc định
async function renderSessionsGrid(classId) {
    const container = document.getElementById('sessionsGrid');
    if (!container) return;

    // Lấy sessions cache hoặc gọi API
    let sessions = sessionCache[classId];
    try {
        if (!sessions) {
            sessions = await API.getSessions(classId); // mong API trả về mảng: [{number:1, date:'2025-12-01'}, ...]
            if (!sessions || sessions.length === 0) {
                // Fallback: tạo 15 buổi từ startDate + weekDay
                const cls = classes.find(c => c.id === classId) || {};
                sessions = generateDefaultSessions(cls.startDate, cls.weekDay, cls.totalSessions || 15);
            }
            sessionCache[classId] = sessions;
        }
    } catch (err) {
        console.error('renderSessionsGrid getSessions error', err);
        const cls = classes.find(c => c.id === classId) || {};
        sessions = generateDefaultSessions(cls.startDate, cls.weekDay, cls.totalSessions || 15);
        sessionCache[classId] = sessions;
    }

    // For each session, load attendance stats (best-effort)
    const statsPromises = sessions.map(async (s) => {
        try {
            const records = await API.getAttendance(classId, s.date);
            return {
                date: s.date,
                onTime: records.filter(r => r.status === 'on-time').length,
                late: records.filter(r => r.status === 'late').length,
                excused: records.filter(r => r.status === 'excused').length,
                absent: records.filter(r => r.status === 'absent').length
            };
        } catch (err) {
            return { date: s.date, onTime: 0, late: 0, excused: 0, absent: 0 };
        }
    });

    const stats = await Promise.all(statsPromises);
    const statsMap = {};
    stats.forEach(s => statsMap[s.date] = s);

    // Build HTML
    const html = sessions.map((s, i) => {
        const st = statsMap[s.date] || { onTime: 0, late: 0, excused: 0, absent: 0 };
        const hasData = (st.onTime + st.late + st.excused + st.absent) > 0;
        const isPast = new Date(s.date) < new Date();
        return `
            <div class="session-card ${i === 0 ? 'active' : ''}" onclick="selectSession('${s.date}')">
                <h4>Buổi ${s.number}</h4>
                <p style="font-size:12px">${formatDate(s.date)}</p>
                <p style="font-size:11px;opacity:0.8">${hasData ? 'Đã điểm danh' : (isPast ? 'Chưa điểm danh' : 'Sắp tới')}</p>
                ${hasData ? `<div class="session-stats">
                    <div class="session-stat"><span>${st.onTime}</span><span>✓</span></div>
                    <div class="session-stat"><span>${st.late}</span><span>⏰</span></div>
                    <div class="session-stat"><span>${st.absent}</span><span>✗</span></div>
                </div>` : ''}
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    // Auto render first session attendance
    if (sessions.length > 0) {
        selectSession(sessions[0].date);
    }
}

// Chọn buổi theo ngày (sessionDate)
function selectSession(sessionDate) {
    currentSessionDate = sessionDate;
    // set active class on clicked card
    document.querySelectorAll('.session-card').forEach(c => c.classList.remove('active'));
    // event.currentTarget can be undefined when called programmatically; find card by date text match
    const card = Array.from(document.querySelectorAll('.session-card')).find(cd => cd.innerText.includes(formatDate(sessionDate)));
    if (card) card.classList.add('active');
    // Render attendance table cho ngày đã chọn
    renderAttendanceTable(sessionDate);
}

// Render bảng điểm danh cho sessionDate
async function renderAttendanceTable(sessionDate) {
    const classStudents = students.filter(s => s.classId === currentClassId) || [];
    const container = document.getElementById('attendanceTableContainer');
    if (!container) return;

    // load existing attendance records cho ngày đó
    let attendanceRecords = [];
    try {
        attendanceRecords = await API.getAttendance(currentClassId, sessionDate) || [];
    } catch (err) {
        console.error('renderAttendanceTable getAttendance error', err);
    }

    const attendanceMap = {};
    attendanceRecords.forEach(r => {
        attendanceMap[r.studentId || r.studentid] = { status: r.status, note: r.note || '' };
    });

    container.innerHTML = `
        <div style="padding:20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
            <h3>Điểm danh ngày ${formatDate(sessionDate)}</h3>
            <button class="btn btn-primary" onclick="saveAttendance()"><i class="fas fa-save"></i> Lưu điểm danh</button>
        </div>
        <table>
            <thead>
                <tr>
                    <th>STT</th><th>Họ tên</th><th>MSSV</th><th>Trạng thái</th><th>Ghi chú</th>
                </tr>
            </thead>
            <tbody>
                ${classStudents.map((s, idx) => {
        const a = attendanceMap[s.id] || { status: 'on-time', note: '' };
        return `<tr>
                        <td>${idx + 1}</td>
                        <td>${s.name}</td>
                        <td>${s.code || ''}</td>
                        <td>
                            <div class="attendance-status">
                                <button class="status-btn on-time ${a.status === 'on-time' ? 'active' : ''}" onclick="setAttendance(this)">✓ Đúng giờ</button>
                                <button class="status-btn late ${a.status === 'late' ? 'active' : ''}" onclick="setAttendance(this)">⏰ Muộn</button>
                                <button class="status-btn excused ${a.status === 'excused' ? 'active' : ''}" onclick="setAttendance(this)">📄 Có phép</button>
                                <button class="status-btn absent ${a.status === 'absent' ? 'active' : ''}" onclick="setAttendance(this)">✗ Vắng</button>
                            </div>
                        </td>
                        <td><input type="text" class="note-input" placeholder="Ghi chú..." value="${(a.note || '')}" data-student-id="${s.id}"></td>
                    </tr>`;
    }).join('')}
            </tbody>
        </table>
    `;
}

// Thay đổi UI của status button trong 1 hàng
function setAttendance(btn) {
    const tr = btn.closest('tr');
    if (!tr) return;
    tr.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// Lưu điểm danh cho currentClassId + currentSessionDate
async function saveAttendance() {
    try {
        if (!currentClassId || !currentSessionDate) {
            showAlert('error', 'Chưa chọn lớp hoặc buổi học');
            return;
        }

        const rows = document.querySelectorAll('#attendanceTableContainer tbody tr');
        const records = [];

        rows.forEach(row => {
            const studentId = parseInt(row.querySelector('.note-input').dataset.studentId);
            const activeBtn = row.querySelector('.status-btn.active');
            const note = row.querySelector('.note-input').value || '';
            if (activeBtn) {
                const status = activeBtn.classList.contains('on-time') ? 'on-time' :
                    activeBtn.classList.contains('late') ? 'late' :
                        activeBtn.classList.contains('excused') ? 'excused' : 'absent';
                records.push({ studentId, status, note });
            }
        });

        await API.saveAttendance(currentClassId, currentSessionDate, records);
        showAlert('success', 'Đã lưu điểm danh');

        // Refresh sessions grid để cập nhật thống kê
        await renderSessionsGrid(currentClassId);
    } catch (err) {
        console.error('saveAttendance error', err);
        showAlert('error', 'Lưu điểm danh thất bại');
    }
}

// ===== STUDENTS CRUD =====
async function loadStudents() {
    try {
        students = await API.getStudents();
        // ensure classes loaded for selects
        if (!classes || classes.length === 0) classes = await API.getClasses();
        renderStudentsTable();
    } catch (err) {
        console.error('loadStudents error', err);
        showAlert('error', 'Không thể tải danh sách học sinh');
    }
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
    const s = students.find(x => x.id === studentId);
    if (!s) return;
    document.getElementById('studentModalTitle').innerHTML = '<i class="fas fa-edit"></i> Chỉnh sửa học sinh';
    document.getElementById('studentId').value = s.id;
    document.getElementById('studentCode').value = s.code || '';
    document.getElementById('studentName').value = s.name || '';
    document.getElementById('studentEmail').value = s.email || '';
    document.getElementById('studentPhone').value = s.phone || '';
    await populateClassesSelect();
    document.getElementById('studentClass').value = s.classId || '';
    openModal('studentModal');
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

async function deleteStudent(studentId) {
    if (!confirm('Bạn có chắc muốn xóa học sinh này?')) return;
    try {
        await API.deleteStudent(studentId);
        showAlert('success', 'Xóa học sinh thành công');
        await loadStudents();
        await loadDashboard();
    } catch (err) {
        console.error('deleteStudent error', err);
        showAlert('error', 'Không thể xóa học sinh');
    }
}

// Populate class select for student modal
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

// ===== TEACHERS CRUD (giữ cơ bản) =====
async function loadTeachers() {
    try {
        teachers = await API.getTeachers();
        renderTeachersTable();
    } catch (err) {
        console.error('loadTeachers error', err);
    }
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
    if (!confirm('Bạn có chắc muốn xóa giáo viên này?')) return;
    try {
        await API.deleteTeacher(teacherId);
        showAlert('success', 'Đã xóa giáo viên');
        await loadTeachers();
        await loadDashboard();
    } catch (err) {
        console.error('deleteTeacher error', err);
        showAlert('error', 'Không thể xóa giáo viên');
    }
}

// ===== CM (Class Manager) CRUD =====
async function showCMs() {
    showContent('cmsContent');
    await loadCMs();
}

async function loadCMs() {
    try {
        cms = await CMAPI.getAll();
        renderCMsTable();
    } catch (err) {
        console.error('loadCMs error', err);
        showAlert('error', 'Không thể tải danh sách CM');
    }
}

function renderCMsTable() {
    const tbody = document.getElementById('cmsTable');
    if (!tbody) return;
    if (!cms || cms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px">Chưa có Class Manager</td></tr>';
        return;
    }

    // Count classes per CM
    const cmClassCount = {};
    classes.forEach(c => { if (c.cmId) cmClassCount[c.cmId] = (cmClassCount[c.cmId] || 0) + 1; });

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
                <button class="action-btn view" onclick="viewCMDetail(${cm.id})"><i class="fas fa-eye"></i></button>
                ${currentUser?.role === 'admin' ? `<button class="action-btn edit" onclick="editCM(${cm.id})"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" onclick="deleteCM(${cm.id})"><i class="fas fa-trash"></i></button>` : ''}
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
    const cm = cms.find(c => c.id === cmId);
    if (!cm) return;
    document.getElementById('cmModalTitle').innerHTML = '<i class="fas fa-edit"></i> Chỉnh sửa Class Manager';
    document.getElementById('cmId').value = cm.id;
    document.getElementById('cmCode').value = cm.code || '';
    document.getElementById('cmName').value = cm.name || '';
    document.getElementById('cmEmail').value = cm.email || '';
    document.getElementById('cmPhone').value = cm.phone || '';
    openModal('cmModal');
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

async function deleteCM(cmId) {
    try {
        // check classes managed by this cm
        const managed = classes.filter(c => c.cmId === cmId);
        if (managed.length > 0) {
            const names = managed.map(x => x.name).join(', ');
            if (!confirm(`CM đang quản lý ${managed.length} lớp (${names}). Xóa sẽ để trống CM cho các lớp này. Bạn có chắc?`)) return;
        } else {
            if (!confirm('Bạn có chắc muốn xóa CM này?')) return;
        }
        await CMAPI.delete(cmId);
        showAlert('success', 'Đã xóa CM');
        await loadCMs();
        await loadDashboard();
    } catch (err) {
        console.error('deleteCM error', err);
        showAlert('error', 'Không thể xóa CM');
    }
}

// ===== UTILITIES / HELPERS =====
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
    // type: 'success'|'error'|'info'
    const el = document.getElementById('globalAlert');
    if (!el) {
        console.log(type, message);
        return;
    }
    el.className = `alert alert-${type}`;
    el.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'info' ? 'info-circle' : 'exclamation-circle'}"></i> <span>${message}</span>`;
    el.style.display = 'flex';
    setTimeout(() => el.style.display = 'none', 3000);
}

function showLoading() { const l = document.getElementById('loadingOverlay'); if (l) l.style.display = 'flex'; }
function hideLoading() { const l = document.getElementById('loadingOverlay'); if (l) l.style.display = 'none'; }

// Format date sang 'dd/mm/yyyy' (vi-VN)
function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN');
    } catch (e) { return dateStr; }
}

// Lấy 2 ký tự đầu tên
function getInitials(name) {
    if (!name) return '';
    return name.split(' ').slice(-2).map(n => n[0]).join('').toUpperCase();
}

// Chuyển weekday index -> tên
function getWeekdayName(day) {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return typeof day === 'number' ? days[day] : (days[parseInt(day)] || '');
}

// Tạo default sessions (nếu API không trả)
// startDate: 'YYYY-MM-DD' or ISO, weekday: 0..6, total: số buổi
function generateDefaultSessions(startDate, weekDay, total = 15) {
    const sessions = [];
    if (!startDate) {
        // nếu không có startDate, gen ngày hôm nay + mỗi tuần 7 ngày
        let base = new Date();
        for (let i = 0; i < total; i++) {
            const d = new Date(base);
            d.setDate(base.getDate() + i * 7);
            sessions.push({ number: i + 1, date: d.toISOString().slice(0, 10) });
        }
        return sessions;
    }
    const start = new Date(startDate);
    // tìm ngày đầu tiên >= start có weekday = weekDay
    const target = parseInt(weekDay);
    let first = new Date(start);
    // Nếu weekDay hợp lệ 0..6, tìm offset
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

// preview sessions (hiển thị số buổi dự đoán)
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

// ===== MISC =====
// Nếu bạn muốn export CM -> dùng XLSX (nếu đã include thư viện)
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
