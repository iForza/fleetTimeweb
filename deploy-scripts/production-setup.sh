#!/bin/bash

# Production Deployment Script для Farm Monitor Pro
# Автор: iForza
# Версия: 1.0.0

set -e  # Остановка при любой ошибке

echo "🚀 Начинаю развертывание Farm Monitor Pro на production сервере..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Проверка прав пользователя
if [ "$EUID" -eq 0 ]; then
    error "Не запускайте этот скрипт под root пользователем в production!"
    exit 1
fi

# Переменные
APP_DIR="/var/www/farm-monitor"
APP_USER="www-data"
NODE_VERSION="18"

log "Обновление системных пакетов..."
sudo apt update && sudo apt upgrade -y

log "Установка необходимых пакетов..."
sudo apt install -y curl software-properties-common nginx ufw fail2ban

# Установка Node.js через NodeSource
log "Установка Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка версий
log "Проверка установленных версий:"
node --version
npm --version

# Установка PM2 глобально
log "Установка PM2..."
sudo npm install -g pm2

# Создание пользователя приложения (если не существует)
if ! id "$APP_USER" &>/dev/null; then
    log "Создание пользователя $APP_USER..."
    sudo useradd --system --home $APP_DIR --shell /bin/bash $APP_USER
fi

# Создание директории приложения
log "Создание директории приложения..."
sudo mkdir -p $APP_DIR
sudo mkdir -p $APP_DIR/logs
sudo chown -R $APP_USER:$APP_USER $APP_DIR

log "Настройка Nginx..."
sudo tee /etc/nginx/sites-available/farm-monitor > /dev/null <<EOF
server {
    listen 80;
    server_name _; # Замените на ваш домен
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Скрытие версии Nginx
    server_tokens off;
    
    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Статические файлы
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri @proxy;
    }
    
    location @proxy {
        proxy_pass http://127.0.0.1:3000;
    }
    
    # Ограничение размера загружаемых файлов
    client_max_body_size 10M;
}
EOF

# Активация сайта
sudo ln -sf /etc/nginx/sites-available/farm-monitor /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации Nginx
sudo nginx -t

log "Настройка файрволла UFW..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

log "Настройка Fail2Ban..."
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban

log "Настройка логротации..."
sudo tee /etc/logrotate.d/farm-monitor > /dev/null <<EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
    su $APP_USER $APP_USER
}
EOF

log "Создание сервиса systemd для автозапуска PM2..."
sudo tee /etc/systemd/system/farm-monitor.service > /dev/null <<EOF
[Unit]
Description=Farm Monitor Pro
Documentation=https://github.com/iForza/fleetTimeweb
After=network.target

[Service]
Type=forking
User=$APP_USER
LimitNOFILE=65536
LimitNPROC=65536
ExecStart=/usr/bin/pm2 start $APP_DIR/ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 reload $APP_DIR/ecosystem.config.js --env production
ExecStop=/usr/bin/pm2 kill
PIDFile=/home/$APP_USER/.pm2/pm2.pid
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=farm-monitor

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable farm-monitor

log "Настройка прав доступа..."
sudo chown -R $APP_USER:$APP_USER $APP_DIR
sudo chmod -R 755 $APP_DIR
sudo chmod -R 750 $APP_DIR/logs

log "Перезапуск сервисов..."
sudo systemctl restart nginx
sudo systemctl restart fail2ban

log "✅ Базовая настройка сервера завершена!"
echo ""
log "Следующие шаги:"
echo "1. Склонируйте репозиторий в $APP_DIR"
echo "2. Создайте .env файл с production настройками"
echo "3. Установите зависимости: npm ci --only=production"
echo "4. Запустите приложение: sudo systemctl start farm-monitor"
echo "5. Настройте SSL сертификат с помощью Certbot"
echo ""
warn "Не забудьте изменить пароли по умолчанию и настроить мониторинг!"

exit 0 