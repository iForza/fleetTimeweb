#!/bin/bash

# SSL Setup Script для Farm Monitor Pro
# Настройка HTTPS с помощью Let's Encrypt Certbot

set -e

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Проверка аргументов
if [ $# -eq 0 ]; then
    error "Использование: $0 <домен>"
    error "Пример: $0 farmmonitor.example.com"
    exit 1
fi

DOMAIN=$1

log "Настройка SSL сертификата для домена: $DOMAIN"

# Установка Certbot
log "Установка Certbot..."
sudo apt update
sudo apt install -y snapd
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot

# Создание символической ссылки
sudo ln -sf /snap/bin/certbot /usr/bin/certbot

# Обновление Nginx конфигурации с доменом
log "Обновление конфигурации Nginx..."
sudo sed -i "s/server_name _;/server_name $DOMAIN;/" /etc/nginx/sites-available/farm-monitor

# Проверка конфигурации
sudo nginx -t

# Перезагрузка Nginx
sudo systemctl reload nginx

# Получение SSL сертификата
log "Получение SSL сертификата..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Настройка автоматического обновления
log "Настройка автоматического обновления сертификата..."
sudo systemctl enable snap.certbot.renew.timer

# Проверка обновления (тест)
sudo certbot renew --dry-run

log "✅ SSL сертификат успешно настроен для $DOMAIN"
log "🔐 Ваш сайт теперь доступен по HTTPS: https://$DOMAIN"

# Проверка статуса сертификата
log "Информация о сертификате:"
sudo certbot certificates 