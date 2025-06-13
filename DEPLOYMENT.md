# 🚀 Руководство по безопасному развертыванию Farm Monitor Pro

## 📋 Содержание
1. [Предварительные требования](#предварительные-требования)
2. [Настройка сервера](#настройка-сервера)
3. [Развертывание приложения](#развертывание-приложения)
4. [Настройка SSL](#настройка-ssl)
5. [Мониторинг и обслуживание](#мониторинг-и-обслуживание)
6. [Безопасность](#безопасность)
7. [Устранение неполадок](#устранение-неполадок)

## 🔧 Предварительные требования

### Серверные требования
- **ОС**: Ubuntu 20.04 LTS или новее
- **RAM**: минимум 1 GB, рекомендуется 2 GB
- **CPU**: 1 vCPU (рекомендуется 2+)
- **Диск**: минимум 10 GB свободного места
- **Node.js**: версия 18 LTS или новее

### Перед началом
- [ ] Доступ к серверу через SSH
- [ ] Права sudo на сервере
- [ ] Домен, направленный на IP сервера (для SSL)
- [ ] Актуальная версия кода в Git репозитории

## 🛠️ Настройка сервера

### 1. Автоматическая настройка (рекомендуется)

```bash
# Загрузите и запустите скрипт настройки
wget https://raw.githubusercontent.com/iForza/fleetTimeweb/main/deploy-scripts/production-setup.sh
chmod +x production-setup.sh
./production-setup.sh
```

### 2. Ручная настройка

#### Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

#### Установка Node.js 18 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

#### Установка необходимых пакетов
```bash
sudo apt install -y nginx pm2 ufw fail2ban git
sudo npm install -g pm2
```

#### Создание пользователя приложения
```bash
sudo useradd --system --home /var/www/farm-monitor --shell /bin/bash www-data
sudo mkdir -p /var/www/farm-monitor/logs
sudo chown -R www-data:www-data /var/www/farm-monitor
```

#### Настройка файрволла
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
```

## 📦 Развертывание приложения

### 1. Клонирование репозитория
```bash
cd /var/www/farm-monitor
sudo -u www-data git clone https://github.com/iForza/fleetTimeweb.git .
```

### 2. Создание .env файла
```bash
sudo -u www-data cp env.example .env
sudo -u www-data nano .env
```

**Пример .env для production:**
```env
NODE_ENV=production
PORT=3000

# Безопасность
SESSION_SECRET=ваш-очень-сложный-секретный-ключ-измените-его
JWT_SECRET=ваш-jwt-секретный-ключ-измените-его

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS=https://ваш-домен.com

# Логирование
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log

# Информация о приложении
APP_NAME=Farm Monitor Pro
APP_VERSION=1.0.0
```

### 3. Установка зависимостей
```bash
sudo -u www-data npm ci --only=production
```

### 4. Настройка Nginx

```bash
sudo nano /etc/nginx/sites-available/farm-monitor
```

```nginx
server {
    listen 80;
    server_name ваш-домен.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    server_tokens off;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Статические файлы
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri @proxy;
    }
    
    location @proxy {
        proxy_pass http://127.0.0.1:3000;
    }
    
    client_max_body_size 10M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/farm-monitor /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Запуск приложения с PM2
```bash
sudo -u www-data pm2 start ecosystem.config.js --env production
sudo -u www-data pm2 save
```

### 6. Настройка автозапуска
```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u www-data --hp /var/www/farm-monitor
```

## 🔐 Настройка SSL

### Автоматическая настройка SSL
```bash
chmod +x deploy-scripts/ssl-setup.sh
./deploy-scripts/ssl-setup.sh ваш-домен.com
```

### Ручная настройка SSL
```bash
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot --nginx -d ваш-домен.com
```

## 📊 Мониторинг и обслуживание

### Проверка статуса
```bash
# Статус приложения
sudo -u www-data pm2 status

# Логи приложения
sudo -u www-data pm2 logs

# Health check
curl http://localhost:3000/health
```

### Полезные команды PM2
```bash
# Перезапуск без даунтайма
sudo -u www-data pm2 reload ecosystem.config.js --env production

# Просмотр метрик
sudo -u www-data pm2 monit

# Остановка
sudo -u www-data pm2 stop farm-monitor-pro

# Удаление
sudo -u www-data pm2 delete farm-monitor-pro
```

### Обновление приложения
```bash
cd /var/www/farm-monitor
sudo -u www-data git pull origin main
sudo -u www-data npm ci --only=production
sudo -u www-data pm2 reload ecosystem.config.js --env production
```

## 🛡️ Безопасность

### Проверка безопасности зависимостей
```bash
npm audit
npm audit fix
```

### Настройка Fail2Ban
```bash
sudo systemctl status fail2ban
sudo fail2ban-client status
```

### Мониторинг логов
```bash
# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Логи приложения
sudo tail -f /var/www/farm-monitor/logs/combined.log

# Системные логи
sudo journalctl -u farm-monitor -f
```

### Регулярные задачи безопасности
```bash
# Добавьте в crontab (sudo crontab -e):

# Обновление системы каждую неделю
0 2 * * 0 apt update && apt upgrade -y

# Проверка SSL сертификата
0 3 1,15 * * certbot renew --quiet

# Ротация логов PM2
0 1 * * * pm2 flush

# Проверка дискового пространства
0 6 * * * df -h | mail -s "Disk Usage Report" admin@ваш-домен.com
```

## 🔍 Устранение неполадок

### Приложение не запускается
```bash
# Проверьте логи
sudo -u www-data pm2 logs

# Проверьте синтаксис
sudo -u www-data node -c server.js

# Проверьте порты
sudo netstat -tulpn | grep 3000
```

### Nginx возвращает 502 Bad Gateway
```bash
# Проверьте статус Node.js приложения
sudo -u www-data pm2 status

# Проверьте логи Nginx
sudo tail -f /var/log/nginx/error.log

# Перезапустите приложение
sudo -u www-data pm2 restart farm-monitor-pro
```

### Проблемы с SSL
```bash
# Проверьте срок действия сертификата
sudo certbot certificates

# Обновите сертификат
sudo certbot renew

# Проверьте конфигурацию Nginx
sudo nginx -t
```

### Высокая загрузка CPU/памяти
```bash
# Мониторинг ресурсов
sudo -u www-data pm2 monit

# Проверьте процессы
top
htop

# Перезапустите приложение
sudo -u www-data pm2 reload ecosystem.config.js --env production
```

### Контакты
- 📧 Email: support@fleetmonitor.ru
- 🐛 Issues: [GitHub Issues](https://github.com/iForza/fleetTimeweb/issues)
- 📖 Документация: [GitHub Wiki](https://github.com/iForza/fleetTimeweb/wiki)

---

## ✅ Чеклист развертывания

- [ ] Сервер настроен и обновлен
- [ ] Node.js 18+ установлен
- [ ] PM2 установлен глобально
- [ ] Nginx настроен и работает
- [ ] Файрволл UFW активирован
- [ ] Fail2Ban настроен
- [ ] Приложение склонировано
- [ ] .env файл создан и настроен
- [ ] Зависимости установлены
- [ ] Приложение запущено через PM2
- [ ] SSL сертификат настроен
- [ ] Автозапуск PM2 настроен
- [ ] Мониторинг настроен
- [ ] Логротация настроена
- [ ] Бэкапы настроены

**Поздравляем! 🎉 Ваше приложение Farm Monitor Pro готово к работе в production среде!** 