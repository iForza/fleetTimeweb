# 🚜 Farm Monitor Pro (Timeweb Edition)

**Современная система мониторинга сельскохозяйственной техники**

---

## 📦 Структура проекта

- `index.html` — основной интерфейс (умная карта, графики, настройки)
- `server.js` — Express сервер для обслуживания сайта
- `package.json` — зависимости и скрипты
- `ecosystem.config.js` — конфиг для PM2 (продакшн-менеджер)
- `.gitignore` — игнорирует временные и служебные файлы

---

## 🚀 Быстрый старт (локально)

1. **Установите Node.js (16+) и npm**
2. Установите зависимости:
   ```bash
   npm install
   ```
3. Запустите сервер:
   ```bash
   npm start
   ```
4. Откройте [http://localhost:3000](http://localhost:3000)

---

## 🌐 Деплой на Timeweb VPS/Cloud

### 1. Клонируйте репозиторий на сервере
```bash
git clone https://github.com/iForza/fleetTimeweb.git
cd fleetTimeweb
```

### 2. Установите Node.js, npm и PM2
```bash
sudo apt update
sudo apt install -y nodejs npm git
sudo npm install -g pm2
```

### 3. Установите зависимости
```bash
npm install
```

### 4. Запустите приложение через PM2
```bash
pm run pm2:start
```

### 5. Проверьте статус
```bash
pm run pm2:logs
pm run pm2:monit
```

### 6. (Рекомендуется) Настройте автозапуск PM2
```bash
pm2 startup
pm2 save
```

---

## 🌍 Настройка домена и HTTPS (Nginx)

1. Установите Nginx:
   ```bash
   sudo apt install nginx
   ```
2. Создайте конфиг для сайта (пример):
   ```nginx
   server {
       listen 80;
       server_name ВАШ_ДОМЕН;
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
3. Перезапустите Nginx:
   ```bash
   sudo systemctl reload nginx
   ```
4. (Опционально) Настройте HTTPS через Certbot:
   ```bash
   sudo apt install snapd
   sudo snap install --classic certbot
   sudo certbot --nginx -d ВАШ_ДОМЕН
   ```

---

## 🛠️ Полезные команды

- Перезапуск: `pm2 restart farm-monitor-pro`
- Остановка: `pm2 stop farm-monitor-pro`
- Удаление: `pm2 delete farm-monitor-pro`
- Логи: `pm2 logs farm-monitor-pro`
- Мониторинг: `pm2 monit`

---

## 📑 Контакты и поддержка

- [GitHub Issues](https://github.com/iForza/fleetTimeweb/issues)
- Email: support@fleetmonitor.ru

---

**Удачного мониторинга!**

## 📋 Возможности

- **Карта** - Отслеживание техники на карте в реальном времени
- **Графики** - Мониторинг данных с техники 
- **Настройки** - Настройка MQTT серверов и профиля

## 🔧 Настройка

### MQTT Подключение
- Используйте публичные MQTT брокеры:
  - `broker.emqx.io:8084` (по умолчанию)
  - `broker.hivemq.com:8884`
  - Или кастомный сервер

### Поддерживаемые топики
- `farm/+/data` - Данные с техники
- `car/+/data` - Совместимость с автомобилями

### Формат данных ESP32
```json
{
  "device_id": "tractor_001",
  "speed": 45.5,
  "temperature": 78.2,
  "fuel": 85,
  "load": 67,
  "latitude": 55.7558,
  "longitude": 37.6176,
  "timestamp": 1702888800000
}
```

## 📁 Структура проекта

```
Farm Monitor Pro/
├── index.html          # Главная страница
├── styles.css          # Стили
├── js/
│   └── app.js          # Основная логика
├── package.json        # Настройки проекта
└── README.md           # Документация
```

## 🌐 Технологии

- **HTML5** - Структура страниц
- **CSS3** - Стилизация
- **JavaScript** - Логика приложения
- **Leaflet** - Карты (простая и стабильная альтернатива)
- **Chart.js** - Графики
- **MQTT.js** - MQTT клиент

## 📱 Страницы

1. **Dashboard** - Модули слева, карта справа
2. **Analytics** - Графики с данными и настройками времени
3. **Settings** - Настройки MQTT и профиля

## ⚙️ Настройки по умолчанию

- MQTT сервер: `broker.emqx.io:8084`
- Обновление данных: каждые 5 секунд
- Язык: Русский
- Центр карты: Москва

## 🐛 Устранение неполадок

### Карта не загружается
- Проверьте интернет соединение
- Убедитесь что Leaflet CSS/JS загружены

### MQTT не подключается  
- Проверьте URL сервера
- Попробуйте другой публичный брокер
- Проверьте консоль браузера (F12)

### Графики не отображаются
- Убедитесь что Chart.js загружен
- Проверьте что есть данные для отображения

## 📄 Лицензия

MIT License - используйте свободно для любых целей.

---

**Версия:** 1.0 Simple  
**Автор:** iForza  
**Дата:** 2025 