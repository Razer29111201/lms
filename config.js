// ===== CONFIGURATION =====

// Google Apps Script Web App URL
// Thay thế URL này bằng URL Web App của bạn sau khi deploy
const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbzFwUtiMQIL4TBLh-8ORkDoL55iAuC2dWDRA_mn_nvTMPIiJsu_CYXYOF628R_DtZ0v/exec',
    // Ví dụ: 'https://script.google.com/macros/s/AKfycby.../exec'

    // App Settings
    APP_NAME: 'ClassFlow',
    APP_VERSION: '1.0.0',

    // Session Settings
    SESSION_KEY: 'classflow_user',
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours

    // Default Values
    DEFAULT_SESSIONS_PER_CLASS: 15,

    // Colors for class cards
    CARD_COLORS: ['green', 'blue', 'orange', 'red'],

    // Demo Users (Xóa sau khi production)
    DEMO_USERS: {
        admin: {
            email: 'admin@classflow.com',
            password: 'admin123',
            role: 'admin',
            name: 'Admin User',
            avatar: 'AD'
        },
        teacher: {
            email: 'teacher@classflow.com',
            password: 'teacher123',
            role: 'teacher',
            name: 'Trần Thị B',
            avatar: 'TB',
            teacherId: 1
        },
        cm: {
            email: 'cm@classflow.com',
            password: 'cm123',
            role: 'cm',
            name: 'Hoàng Văn E',
            avatar: 'HE',
            cmId: 1
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}