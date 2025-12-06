// ===== EXCEL EXPORT FUNCTIONS =====

// Export All Data
async function exportAllData() {
    try {
        showLoading();

        // Get all data
        const classesData = await API.getClasses();
        const studentsData = await API.getStudents();
        const teachersData = await API.getTeachers();

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Add Classes sheet
        const classesSheet = XLSX.utils.json_to_sheet(classesData.map(c => ({
            'Mã lớp': c.code,
            'Tên lớp': c.name,
            'Giáo viên': c.teacher,
            'Class Manager': c.cm,
            'Số học sinh': c.students,
            'Ngày bắt đầu': formatDate(c.start),
            'Ngày kết thúc': formatDate(c.end),
            'Lịch học': c.schedule,
            'Số buổi học': c.sessions
        })));
        XLSX.utils.book_append_sheet(wb, classesSheet, 'Lớp học');

        // Add Students sheet
        const studentsSheet = XLSX.utils.json_to_sheet(studentsData.map(s => ({
            'MSSV': s.code,
            'Họ và tên': s.name,
            'Email': s.email,
            'Số điện thoại': s.phone,
            'Lớp học': s.className
        })));
        XLSX.utils.book_append_sheet(wb, studentsSheet, 'Học sinh');

        // Add Teachers sheet
        const teachersSheet = XLSX.utils.json_to_sheet(teachersData.map(t => ({
            'Mã GV': t.code,
            'Họ và tên': t.name,
            'Email': t.email,
            'Số điện thoại': t.phone,
            'Chuyên môn': t.subject,
            'Trạng thái': t.active ? 'Hoạt động' : 'Tạm dừng'
        })));
        XLSX.utils.book_append_sheet(wb, teachersSheet, 'Giáo viên');

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `ClassFlow_Full_Export_${timestamp}.xlsx`;

        // Save file
        XLSX.writeFile(wb, filename);

        hideLoading();
        showAlert('success', 'Đã export toàn bộ dữ liệu thành công!');
    } catch (error) {
        hideLoading();
        console.error('Error exporting all data:', error);
        showAlert('error', 'Có lỗi xảy ra khi export dữ liệu');
    }
}

// Export Classes
async function exportClasses() {
    try {
        showLoading();

        let classesData = await API.getClasses();

        // Filter based on user role
        if (currentUser.role === 'teacher') {
            classesData = classesData.filter(c => c.teacherId === currentUser.teacherId);
        } else if (currentUser.role === 'cm') {
            classesData = classesData.filter(c => c.cmId === currentUser.cmId);
        }

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Prepare data
        const data = classesData.map(c => ({
            'Mã lớp': c.code,
            'Tên lớp': c.name,
            'Giáo viên': c.teacher,
            'Class Manager': c.cm,
            'Số học sinh': c.students,
            'Ngày bắt đầu': formatDate(c.start),
            'Ngày kết thúc': formatDate(c.end),
            'Lịch học': c.schedule,
            'Số buổi học': c.sessions
        }));

        const ws = XLSX.utils.json_to_sheet(data);

        // Set column widths
        ws['!cols'] = [
            { wch: 12 }, // Mã lớp
            { wch: 30 }, // Tên lớp
            { wch: 20 }, // Giáo viên
            { wch: 20 }, // Class Manager
            { wch: 12 }, // Số học sinh
            { wch: 15 }, // Ngày bắt đầu
            { wch: 15 }, // Ngày kết thúc
            { wch: 25 }, // Lịch học
            { wch: 12 }  // Số buổi học
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Danh sách lớp học');

        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `Danh_sach_lop_hoc_${timestamp}.xlsx`;

        XLSX.writeFile(wb, filename);

        hideLoading();
        showAlert('success', 'Đã export danh sách lớp học thành công!');
    } catch (error) {
        hideLoading();
        console.error('Error exporting classes:', error);
        showAlert('error', 'Có lỗi xảy ra khi export dữ liệu');
    }
}

// Export Students
async function exportStudents() {
    try {
        showLoading();

        const studentsData = await API.getStudents();

        const wb = XLSX.utils.book_new();

        const data = studentsData.map(s => ({
            'MSSV': s.code,
            'Họ và tên': s.name,
            'Email': s.email,
            'Số điện thoại': s.phone,
            'Lớp học': s.className
        }));

        const ws = XLSX.utils.json_to_sheet(data);

        ws['!cols'] = [
            { wch: 12 },
            { wch: 25 },
            { wch: 30 },
            { wch: 15 },
            { wch: 15 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Danh sách học sinh');

        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `Danh_sach_hoc_sinh_${timestamp}.xlsx`;

        XLSX.writeFile(wb, filename);

        hideLoading();
        showAlert('success', 'Đã export danh sách học sinh thành công!');
    } catch (error) {
        hideLoading();
        console.error('Error exporting students:', error);
        showAlert('error', 'Có lỗi xảy ra khi export dữ liệu');
    }
}

// Export Teachers
async function exportTeachers() {
    try {
        showLoading();

        const teachersData = await API.getTeachers();

        const wb = XLSX.utils.book_new();

        const data = teachersData.map(t => ({
            'Mã GV': t.code,
            'Họ và tên': t.name,
            'Email': t.email,
            'Số điện thoại': t.phone,
            'Chuyên môn': t.subject,
            'Trạng thái': t.active ? 'Hoạt động' : 'Tạm dừng'
        }));

        const ws = XLSX.utils.json_to_sheet(data);

        ws['!cols'] = [
            { wch: 12 },
            { wch: 25 },
            { wch: 30 },
            { wch: 15 },
            { wch: 20 },
            { wch: 12 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Danh sách giáo viên');

        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `Danh_sach_giao_vien_${timestamp}.xlsx`;

        XLSX.writeFile(wb, filename);

        hideLoading();
        showAlert('success', 'Đã export danh sách giáo viên thành công!');
    } catch (error) {
        hideLoading();
        console.error('Error exporting teachers:', error);
        showAlert('error', 'Có lỗi xảy ra khi export dữ liệu');
    }
}

// Export Class Detail with Attendance
async function exportClassDetail(classId) {
    try {
        showLoading();

        const cls = classes.find(c => c.id === classId);
        if (!cls) {
            showAlert('error', 'Không tìm thấy lớp học');
            return;
        }

        const classStudents = students.filter(s => s.classId === classId);

        const wb = XLSX.utils.book_new();

        // Class Info Sheet
        const classInfoData = [
            { 'Thông tin': 'Mã lớp', 'Giá trị': cls.code },
            { 'Thông tin': 'Tên lớp', 'Giá trị': cls.name },
            { 'Thông tin': 'Giáo viên', 'Giá trị': cls.teacher },
            { 'Thông tin': 'Class Manager', 'Giá trị': cls.cm },
            { 'Thông tin': 'Số học sinh', 'Giá trị': cls.students },
            { 'Thông tin': 'Ngày bắt đầu', 'Giá trị': formatDate(cls.start) },
            { 'Thông tin': 'Ngày kết thúc', 'Giá trị': formatDate(cls.end) },
            { 'Thông tin': 'Lịch học', 'Giá trị': cls.schedule },
            { 'Thông tin': 'Số buổi học', 'Giá trị': cls.sessions }
        ];

        const classInfoSheet = XLSX.utils.json_to_sheet(classInfoData);
        classInfoSheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
        XLSX.utils.book_append_sheet(wb, classInfoSheet, 'Thông tin lớp');

        // Students List Sheet
        const studentsData = classStudents.map(s => ({
            'MSSV': s.code,
            'Họ và tên': s.name,
            'Email': s.email,
            'Số điện thoại': s.phone
        }));

        const studentsSheet = XLSX.utils.json_to_sheet(studentsData);
        studentsSheet['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, studentsSheet, 'Danh sách học sinh');

        // Attendance Template Sheet (for each session)
        const attendanceTemplate = classStudents.map((s, index) => ({
            'STT': index + 1,
            'MSSV': s.code,
            'Họ và tên': s.name,
            'Buổi 1': '',
            'Buổi 2': '',
            'Buổi 3': '',
            'Buổi 4': '',
            'Buổi 5': '',
            'Buổi 6': '',
            'Buổi 7': '',
            'Buổi 8': '',
            'Buổi 9': '',
            'Buổi 10': '',
            'Buổi 11': '',
            'Buổi 12': '',
            'Buổi 13': '',
            'Buổi 14': '',
            'Buổi 15': '',
            'Tổng có mặt': '',
            'Tổng vắng': ''
        }));

        const attendanceSheet = XLSX.utils.json_to_sheet(attendanceTemplate);
        attendanceSheet['!cols'] = [
            { wch: 5 },
            { wch: 12 },
            { wch: 25 },
            ...Array(15).fill({ wch: 8 }),
            { wch: 12 },
            { wch: 12 }
        ];
        XLSX.utils.book_append_sheet(wb, attendanceSheet, 'Bảng điểm danh');

        const filename = `${cls.code}_${cls.name}_Chi_tiet.xlsx`;
        XLSX.writeFile(wb, filename);

        hideLoading();
        showAlert('success', 'Đã export chi tiết lớp học thành công!');
    } catch (error) {
        hideLoading();
        console.error('Error exporting class detail:', error);
        showAlert('error', 'Có lỗi xảy ra khi export dữ liệu');
    }
}

// Import from Excel
async function importFromExcel(file, type) {
    try {
        showLoading();

        const data = await readExcelFile(file);

        switch (type) {
            case 'students':
                await importStudents(data);
                break;
            case 'teachers':
                await importTeachers(data);
                break;
            case 'classes':
                await importClasses(data);
                break;
            default:
                throw new Error('Unknown import type');
        }

        hideLoading();
        showAlert('success', 'Import dữ liệu thành công!');
    } catch (error) {
        hideLoading();
        console.error('Error importing data:', error);
        showAlert('error', 'Có lỗi xảy ra khi import dữ liệu: ' + error.message);
    }
}

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

async function importStudents(data) {
    for (const row of data) {
        const studentData = {
            code: row['MSSV'] || row['Mã số'] || '',
            name: row['Họ và tên'] || row['Họ tên'] || '',
            email: row['Email'] || '',
            phone: row['Số điện thoại'] || row['SĐT'] || '',
            classId: 0,
            className: row['Lớp học'] || row['Lớp'] || ''
        };

        // Find class by code
        const cls = classes.find(c => c.code === studentData.className);
        if (cls) {
            studentData.classId = cls.id;
        }

        await API.createStudent(studentData);
    }

    await loadStudents();
}

async function importTeachers(data) {
    for (const row of data) {
        const teacherData = {
            code: row['Mã GV'] || row['Mã'] || '',
            name: row['Họ và tên'] || row['Họ tên'] || '',
            email: row['Email'] || '',
            phone: row['Số điện thoại'] || row['SĐT'] || '',
            subject: row['Chuyên môn'] || '',
            active: true
        };

        await API.createTeacher(teacherData);
    }

    await loadTeachers();
}

async function importClasses(data) {
    for (const row of data) {
        const classData = {
            code: row['Mã lớp'] || row['Mã'] || '',
            name: row['Tên lớp'] || row['Tên'] || '',
            teacher: row['Giáo viên'] || '',
            teacherId: 0,
            cm: row['Class Manager'] || row['CM'] || '',
            cmId: 0,
            students: parseInt(row['Số học sinh']) || 0,
            start: row['Ngày bắt đầu'] || '',
            end: row['Ngày kết thúc'] || '',
            schedule: row['Lịch học'] || '',
            sessions: parseInt(row['Số buổi học']) || 15,
            color: CONFIG.CARD_COLORS[Math.floor(Math.random() * CONFIG.CARD_COLORS.length)]
        };

        await API.createClass(classData);
    }

    await loadClasses();
}

// Download Excel Template
function downloadTemplate(type) {
    const wb = XLSX.utils.book_new();
    let data = [];
    let filename = '';

    switch (type) {
        case 'students':
            data = [
                {
                    'MSSV': '2024001',
                    'Họ và tên': 'Nguyễn Văn A',
                    'Email': 'nguyenvana@email.com',
                    'Số điện thoại': '0901234567',
                    'Lớp học': 'WEB101'
                }
            ];
            filename = 'Mau_Danh_sach_Hoc_sinh.xlsx';
            break;

        case 'teachers':
            data = [
                {
                    'Mã GV': 'GV001',
                    'Họ và tên': 'Trần Thị B',
                    'Email': 'tranthi@email.com',
                    'Số điện thoại': '0912345678',
                    'Chuyên môn': 'Web Development'
                }
            ];
            filename = 'Mau_Danh_sach_Giao_vien.xlsx';
            break;

        case 'classes':
            data = [
                {
                    'Mã lớp': 'WEB101',
                    'Tên lớp': 'Lập trình Web Frontend',
                    'Giáo viên': 'Trần Thị B',
                    'Class Manager': 'Hoàng Văn E',
                    'Số học sinh': 28,
                    'Ngày bắt đầu': '01/09/2024',
                    'Ngày kết thúc': '30/11/2024',
                    'Lịch học': 'T2,T4,T6: 18:00-20:00',
                    'Số buổi học': 15
                }
            ];
            filename = 'Mau_Danh_sach_Lop_hoc.xlsx';
            break;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, filename);

    showAlert('success', 'Đã tải xuống file mẫu thành công!');
}