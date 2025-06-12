const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');

// Инициализация Express приложения
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для логирования
const morgan = require('morgan');
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Middleware безопасности
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Сжатие gzip
app.use(compression());

// CORS для API запросов
app.use(cors({
    origin: true,
    credentials: true
}));

// Обслуживание статических файлов
app.use(express.static(path.join(__dirname, '.'), {
    maxAge: '1d', // Кэширование на 1 день
    etag: true
}));

// Основной маршрут
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check для мониторинга
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: require('./package.json').version
    });
});

// API для получения информации о приложении
app.get('/api/info', (req, res) => {
    res.json({
        name: 'Farm Monitor Pro',
        version: require('./package.json').version,
        description: 'Профессиональная система мониторинга сельскохозяйственной техники',
        features: [
            'Умное переключение между Esri и демо картами',
            'Интерактивная карта с маркерами техники',
            'Графики аналитики в реальном времени',
            'MQTT интеграция для ESP32 модулей',
            'Мобильная адаптация'
        ]
    });
});

// 404 обработчик
app.use('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Обработчик ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Что-то пошло не так'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📡 Получен сигнал SIGTERM, завершение работы сервера...');
    server.close(() => {
        console.log('✅ Сервер закрыт');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📡 Получен сигнал SIGINT, завершение работы сервера...');
    server.close(() => {
        console.log('✅ Сервер закрыт');
        process.exit(0);
    });
});

// Запуск сервера
const server = app.listen(PORT, () => {
    console.log(`🚀 Farm Monitor Pro сервер запущен на порту ${PORT}`);
    console.log(`🌐 Сайт доступен по адресу: http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📱 Приложение готово к работе!`);
});

module.exports = app; 