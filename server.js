require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Инициализация Express приложения
const app = express();
const PORT = process.env.PORT || 3000;

// Настройка CORS с ограничениями
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(origin => origin.trim())
        : true,
    credentials: true,
    optionsSuccessStatus: 200
};

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 минут
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // лимит запросов
    message: {
        error: 'Слишком много запросов с вашего IP, попробуйте позже.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// API rate limiting (более строгий)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 50, // лимит для API
    message: {
        error: 'Слишком много API запросов, попробуйте позже.'
    }
});

// Middleware для логирования
const morgan = require('morgan');
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
}

// Helmet для безопасности (упрощенная версия)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "wss:", "ws:", "*.emqxcloud.com"],
            objectSrc: ["'none'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
    crossOriginEmbedderPolicy: false
}));

// Дополнительные security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});

// Настройка trust proxy для работы за Nginx
app.set('trust proxy', 1);

// Применяем rate limiting
app.use(limiter);
app.use('/api/', apiLimiter);

// Middleware для парсинга JSON с ограничением размера
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Сжатие gzip
app.use(compression());

// CORS
app.use(cors(corsOptions));

// Создание директории для логов
const fs = require('fs');
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Обслуживание статических файлов
app.use(express.static(path.join(__dirname, '.'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Основной маршрут
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check для мониторинга
app.get('/health', (req, res) => {
    const healthInfo = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'development',
        version: require('./package.json').version,
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        pid: process.pid
    };
    
    res.json(healthInfo);
});

// API для получения информации о приложении
app.get('/api/info', (req, res) => {
    res.json({
        name: process.env.APP_NAME || 'Farm Monitor Pro',
        version: require('./package.json').version,
        description: 'Профессиональная система мониторинга сельскохозяйственной техники',
        features: [
            'Умное переключение между Esri и демо картами',
            'Интерактивная карта с маркерами техники',
            'Графики аналитики в реальном времени',
            'MQTT интеграция для ESP32 модулей',
            'Мобильная адаптация'
        ],
        environment: process.env.NODE_ENV || 'development'
    });
});

// Middleware для валидации ошибок
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Ошибка валидации',
            details: errors.array()
        });
    }
    next();
};

// 404 обработчик
app.use('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Обработчик ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    
    // Не раскрываем детали ошибок в production
    const errorResponse = {
        error: 'Внутренняя ошибка сервера'
    };
    
    if (process.env.NODE_ENV === 'development') {
        errorResponse.message = err.message;
        errorResponse.stack = err.stack;
    }
    
    res.status(err.status || 500).json(errorResponse);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`📡 Получен сигнал ${signal}, начинаю graceful shutdown...`);
    
    server.close((err) => {
        if (err) {
            console.error('❌ Ошибка при закрытии сервера:', err);
            process.exit(1);
        }
        
        console.log('✅ Сервер закрыт корректно');
        process.exit(0);
    });
    
    // Принудительное завершение через 30 секунд
    setTimeout(() => {
        console.error('💥 Принудительное завершение процесса');
        process.exit(1);
    }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Обработка необработанных промисов и исключений
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

// Запуск сервера
const server = app.listen(PORT, () => {
    console.log(`🚀 ${process.env.APP_NAME || 'Farm Monitor Pro'} запущен на порту ${PORT}`);
    console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🛡️  Безопасность: Helmet, CORS, Rate Limiting активированы`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📱 Приложение готово к работе!`);
});

module.exports = app; 