const CONFIG = {
    // Thay đổi URL này để trỏ đến backend Express.js
    API_URL: 'https://backend-lms-y0yb.onrender.com/api',
    // Hoặc khi deploy production: 'https://your-domain.com/api'

    // App Settings
    APP_NAME: 'ClassFlow',
    APP_VERSION: '2.0.0',

    // Session Settings
    SESSION_KEY: 'classflow_user',
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours

    // Default Values
    DEFAULT_SESSIONS_PER_CLASS: 15,

    // Colors for class cards
    CARD_COLORS: ['green', 'blue', 'orange', 'red'],

    // Demo Users (xóa khi production)
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}