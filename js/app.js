document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Farm Monitor Pro - Smart Map запущен");

    // Глобальные переменные
    let map, view, graphicsLayer;
    let mapMode = 'demo'; // 'esri' или 'demo'
    let mqttClient = null;
    const vehicleGraphics = new Map(); // Хранилище для маркеров техники
    let Point, Graphic, PictureMarkerSymbol, PopupTemplate; // Переменные для Esri модулей

    // --- Инициализация ---
    loadSettingsAndConnect();
    checkInternetAndLoadMap();

    // --- Функции для управления картой ---
    function checkInternetAndLoadMap() {
        showLoadingIndicator(true);

        // Проверка доступности скриптов Esri
        const esriScript = document.createElement('script');
        esriScript.src = 'https://js.arcgis.com/4.29/';
        document.head.appendChild(esriScript);

        esriScript.onload = () => {
            console.log('✅ Скрипты Esri ArcGIS загружены успешно.');
            initializeEsriMap();
        };

        esriScript.onerror = () => {
            console.warn('⚠️ Не удалось загрузить скрипты Esri. Включаю демо-режим.');
            showDemoMap();
        };
    }

    function initializeEsriMap() {
        require([
            "esri/Map",
            "esri/views/MapView",
            "esri/Graphic",
            "esri/layers/GraphicsLayer",
            "esri/geometry/Point",
            "esri/symbols/PictureMarkerSymbol",
            "esri/PopupTemplate"
        ], (Map, MapView, EsriGraphic, EsriGraphicsLayer, EsriPoint, EsriPictureMarkerSymbol, EsriPopupTemplate) => {
            // Сохраняем конструкторы в глобальные переменные
            Point = EsriPoint;
            Graphic = EsriGraphic;
            PictureMarkerSymbol = EsriPictureMarkerSymbol;
            PopupTemplate = EsriPopupTemplate;

            map = new Map({ basemap: "satellite" });
            view = new MapView({
                container: "esriMapDiv",
                map: map,
                center: [37.6176, 55.7558],
                zoom: 10
            });
            graphicsLayer = new EsriGraphicsLayer();
            map.add(graphicsLayer);

            view.when(() => {
                console.log('🗺️ Карта Esri готова. Ожидание данных от MQTT...');
                showEsriMap();
                // Старая функция addEsriVehicleMarkers больше не нужна при запуске
            }).catch(error => {
                console.error("❌ Ошибка инициализации карты Esri:", error);
                showDemoMap();
            });

            // Обновление координат при перемещении мыши
            const coordsWidget = document.getElementById("coordinates-info");
            view.on("pointer-move", (event) => {
                const point = view.toMap({ x: event.x, y: event.y });
                if (point) {
                    coordsWidget.innerHTML = `Шир: ${point.latitude.toFixed(4)}, Дол: ${point.longitude.toFixed(4)}`;
                }
            });
        });
    }

    function showEsriMap() {
        mapMode = 'esri';
        showLoadingIndicator(false);
        document.getElementById('esriMapDiv').classList.add('active');
        document.getElementById('demoMap').classList.remove('active');
        document.getElementById('mapModeIndicator').textContent = '🌍 Esri ArcGIS (Онлайн)';
        updateConnectionStatus('online');
    }

    function showDemoMap() {
        mapMode = 'demo';
        showLoadingIndicator(false);
        document.getElementById('esriMapDiv').classList.remove('active');
        document.getElementById('demoMap').classList.add('active');
        document.getElementById('mapModeIndicator').textContent = '🗺️ Демо карта (Офлайн)';
        updateConnectionStatus('offline');
    }

    function showLoadingIndicator(show) {
        const indicator = document.getElementById('loadingIndicator');
        if (show) {
            indicator.classList.add('show');
        } else {
            indicator.classList.remove('show');
        }
    }

    function updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        if (status === 'online') {
            statusElement.textContent = 'Интернет карта';
            statusElement.className = 'status online';
        } else {
            statusElement.textContent = 'Автономный режим';
            statusElement.className = 'status offline';
        }
    }

    function updateVehicleOnMap(data) {
        if (!graphicsLayer || !Point) {
            console.warn("Esri карта еще не готова для обновления.");
            return;
        }

        const vehicleId = data.device_id;
        let vehicleGraphic = vehicleGraphics.get(vehicleId);

        const newPoint = new Point({
            longitude: data.longitude,
            latitude: data.latitude
        });

        const vehicleStatus = data.speed > 0 ? 'online' : 'offline';
        const iconUrl = createVehicleIcon("🚜", vehicleStatus);
        
        const newPopupTemplate = new PopupTemplate({
            title: `Техника: ${data.device_id}`,
            content: `
                <div style="padding: 10px; font-family: 'Segoe UI', sans-serif;">
                    <p><strong>Статус:</strong> ${vehicleStatus === 'online' ? '🟢 В движении' : '🔴 Остановлен'}</p>
                    <p><strong>Скорость:</strong> ${data.speed.toFixed(1)} км/ч</p>
                    <p><strong>Топливо:</strong> ${data.fuel}%</p>
                    <p><strong>Температура:</strong> ${data.temperature}°C</p>
                    <p><strong>Координаты:</strong> ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}</p>
                    <p><small>Timestamp: ${new Date(data.timestamp).toLocaleString()}</small></p>
                </div>
            `
        });

        if (vehicleGraphic) {
            // Маркер уже есть, обновляем его
            vehicleGraphic.geometry = newPoint;
            vehicleGraphic.popupTemplate = newPopupTemplate;
            vehicleGraphic.symbol.url = iconUrl;
            console.log(`🔄 Обновлен маркер для ${vehicleId}`);
        } else {
            // Маркера нет, создаем новый
            const newMarkerSymbol = new PictureMarkerSymbol({
                url: iconUrl,
                width: "32px",
                height: "32px"
            });

            vehicleGraphic = new Graphic({
                geometry: newPoint,
                symbol: newMarkerSymbol,
                popupTemplate: newPopupTemplate,
                attributes: {
                    id: vehicleId
                }
            });

            graphicsLayer.add(vehicleGraphic);
            vehicleGraphics.set(vehicleId, vehicleGraphic);
            console.log(`➕ Создан новый маркер для ${vehicleId}`);
        }
    }

    function createVehicleIcon(emoji, status) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = status === 'online' ? '#22C55E' : '#EF4444';
        ctx.beginPath();
        ctx.arc(32, 32, 30, 0, 2 * Math.PI);
        ctx.fill();
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 32, 32);
        return canvas.toDataURL();
    }

    function showVehicleInfo(name, speed, fuel, temp) {
        const status = speed > 0 ? 'В сети' : 'Офлайн';
        const statusIcon = speed > 0 ? '🟢' : '🔴';
        showToast(`🚜 ${name} | ${statusIcon} ${status} | 🚀 ${speed} км/ч`, 'info');
    }

    // --- Система уведомлений ---
    function showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.5s forwards';
            setTimeout(() => toast.remove(), 500);
        }, duration);
    }
    
    // Добавим анимацию для исчезновения
    const styleSheet = document.createElement("style")
    styleSheet.type = "text/css"
    styleSheet.innerText = `
        @keyframes slideOut {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
    `;
    document.head.appendChild(styleSheet);


    function showConfirmation(message, onConfirm) {
        const modal = document.getElementById('confirmation-modal');
        const messageEl = document.getElementById('confirmation-message');
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');

        messageEl.textContent = message;
        modal.classList.add('active');

        const confirmHandler = () => {
            onConfirm();
            close();
        };

        const cancelHandler = () => {
            close();
        };

        const close = () => {
            modal.classList.remove('active');
            confirmBtn.removeEventListener('click', confirmHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
        };
        
        confirmBtn.addEventListener('click', confirmHandler);
        cancelBtn.addEventListener('click', cancelHandler);
    }

    // --- Навигация ---
    window.showPage = function(pageId, event) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById(pageId + 'Page').classList.add('active');
        event.target.classList.add('active');
        console.log(`Переключено на страницу: ${pageId}`);
    }

    // --- MQTT ---
    function loadSettingsAndConnect() {
        const settings = getMqttSettings();
        document.getElementById('mqttServer').value = settings.server;
        document.getElementById('mqttPort').value = settings.port;
        document.getElementById('mqttTopic').value = settings.topic;
        connectMQTT();
    }

    function getMqttSettings() {
        const defaults = { server: 'broker.emqx.io', port: '8084', topic: 'farm/+/data' };
        let settings = JSON.parse(localStorage.getItem('mqttSettings'));
        return settings || defaults;
    }

    function connectMQTT() {
        if (mqttClient && mqttClient.connected) {
            mqttClient.end(true);
        }
        const settings = getMqttSettings();
        const brokerUrl = `wss://${settings.server}:${settings.port}/mqtt`;
        const options = {
            clientId: 'farm_monitor_web_' + Math.random().toString(16).substr(2, 8),
            clean: true,
            connectTimeout: 10000
        };
        console.log(`🔄 Подключение к MQTT брокеру: ${brokerUrl}`);
        updateMqttStatus('connecting', `Подключение к ${settings.server}...`);
        mqttClient = mqtt.connect(brokerUrl, options);

        mqttClient.on('connect', () => {
            console.log('✅ MQTT брокер подключен!');
            updateMqttStatus('connected', `Подключено к ${settings.server}`);
            const topics = [settings.topic, 'car/+/data'];
            mqttClient.subscribe(topics, (err) => {
                if (!err) console.log(`✔️ Подписка на топики: ${topics.join(', ')}`);
            });
        });

        mqttClient.on('message', (topic, message) => {
            console.log(`📥 Получено сообщение | Топик: ${topic} | Сообщение: ${message.toString()}`);
            try {
                const data = JSON.parse(message.toString());
                // Проверяем, есть ли в сообщении необходимые данные
                if (data.device_id && data.latitude && data.longitude) {
                    // Если это Esri карта, обновляем ее
                    if (mapMode === 'esri') {
                        updateVehicleOnMap(data);
                    }
                    // TODO: Добавить логику для демо-карты, если нужно
                } else {
                    console.warn('⚠️ Получены неполные данные от MQTT:', data);
                }
            } catch (e) {
                console.error('❌ Ошибка парсинга JSON из MQTT:', e);
            }
        });

        mqttClient.on('error', (err) => {
            console.error('❌ Ошибка MQTT соединения:', err);
            updateMqttStatus('error', 'Ошибка соединения');
            mqttClient.end();
        });

        mqttClient.on('close', () => {
            console.log('🔌 MQTT соединение закрыто.');
            updateMqttStatus('disconnected', 'Отключено');
        });
    }

    function updateMqttStatus(status, text) {
        const statusEl = document.getElementById('mqttStatus');
        if (statusEl) {
            statusEl.className = `settings-item mqtt-status ${status}`;
            statusEl.textContent = text;
        }
    }

    // --- Функции для кнопок интерфейса ---
    window.saveMqttSettings = function() {
        const settings = {
            server: document.getElementById('mqttServer').value,
            port: document.getElementById('mqttPort').value,
            topic: document.getElementById('mqttTopic').value
        };
        localStorage.setItem('mqttSettings', JSON.stringify(settings));
        showToast("Настройки MQTT сохранены. Переподключаемся...", "success");
        connectMQTT();
    }

    window.testConnection = function() {
        console.log("🔍 Тестирование соединения...");
        connectMQTT();
    }

    window.refreshCharts = function() {
        const timeRange = document.getElementById('timeRange').value;
        console.log(`🔄 Обновление графиков для периода: ${timeRange}`);
        showToast(`Графики для периода "${timeRange}" обновлены.`, 'info');
    }

    window.saveProfile = function() {
        const name = document.getElementById('userName').value;
        const email = document.getElementById('userEmail').value;
        const language = document.getElementById('language').value;
        console.log("👤 Сохранение профиля:", { name, email, language });
        console.log("👤 Профиль сохранен");
        showToast("Профиль успешно сохранен!", "success");
    }

    window.exportData = function() {
        const period = document.getElementById('exportPeriod').value;
        console.log(`📥 Экспорт данных за период: ${period}`);
        showToast(`Экспорт данных за период "${period}" начат.`, 'info');
    }

    window.clearData = function() {
        showConfirmation("Вы уверены, что хотите очистить все локальные данные?", () => {
            console.log("🗑️ Очистка данных...");
            // Здесь может быть логика очистки, например localStorage
            showToast("Все данные были успешно очищены.", "success");
        });
    }
}); 