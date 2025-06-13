/**
 * MQTT Client для Farm Monitor Pro
 * Подключение к EMQX Cloud брокеру
 */

class FarmMQTTClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.config = {
            host: 'o0acf6a7.ala.dedicated.gcp.emqxcloud.com',
            port: 8083, // WebSocket port
            clientId: 'iforza_' + Math.random().toString(16).substr(2, 8),
            username: 'iforza',
            password: '', // Установите ваш пароль
            topic: 'car/+/data', // Подписка на все устройства
            publishTopic: 'car', // Базовый топик для публикации
            reconnectPeriod: 3000,
            connectTimeout: 30000,
            keepalive: 60,
            clean: true
        };
        
        this.callbacks = {
            onConnect: null,
            onDisconnect: null,
            onMessage: null,
            onError: null
        };
    }

    /**
     * Подключение к MQTT брокеру
     */
    connect(password = '') {
        if (this.client) {
            this.disconnect();
        }

        this.config.password = password;
        
        try {
            // Используем MQTT.js через CDN
            const options = {
                clientId: this.config.clientId,
                username: this.config.username,
                password: this.config.password,
                reconnectPeriod: this.config.reconnectPeriod,
                connectTimeout: this.config.connectTimeout,
                keepalive: this.config.keepalive,
                clean: this.config.clean,
                protocol: 'ws', // WebSocket protocol
                protocolId: 'MQTT',
                protocolVersion: 4
            };

            const brokerUrl = `ws://${this.config.host}:${this.config.port}/mqtt`;
            console.log(`🔌 Подключение к MQTT брокеру: ${brokerUrl}`);
            
            this.client = mqtt.connect(brokerUrl, options);
            
            this.client.on('connect', () => {
                console.log('✅ Подключен к EMQX Cloud MQTT брокеру');
                this.isConnected = true;
                
                // Подписываемся на топики устройств
                this.client.subscribe(this.config.topic, (err) => {
                    if (err) {
                        console.error('❌ Ошибка подписки:', err);
                    } else {
                        console.log(`📡 Подписка на топик: ${this.config.topic}`);
                    }
                });
                
                if (this.callbacks.onConnect) {
                    this.callbacks.onConnect();
                }
            });
            
            this.client.on('message', (topic, message) => {
                try {
                    const data = JSON.parse(message.toString());
                    console.log(`📨 Получено сообщение из ${topic}:`, data);
                    
                    if (this.callbacks.onMessage) {
                        this.callbacks.onMessage(topic, data);
                    }
                } catch (error) {
                    console.error('❌ Ошибка парсинга MQTT сообщения:', error);
                }
            });
            
            this.client.on('disconnect', () => {
                console.log('🔌 Отключен от MQTT брокера');
                this.isConnected = false;
                
                if (this.callbacks.onDisconnect) {
                    this.callbacks.onDisconnect();
                }
            });
            
            this.client.on('error', (error) => {
                console.error('❌ Ошибка MQTT:', error);
                this.isConnected = false;
                
                if (this.callbacks.onError) {
                    this.callbacks.onError(error);
                }
            });
            
        } catch (error) {
            console.error('❌ Ошибка создания MQTT клиента:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
        }
    }

    /**
     * Отключение от брокера
     */
    disconnect() {
        if (this.client) {
            this.client.end();
            this.client = null;
            this.isConnected = false;
            console.log('🔌 MQTT клиент отключен');
        }
    }

    /**
     * Публикация данных
     */
    publish(deviceId, data) {
        if (!this.isConnected || !this.client) {
            console.error('❌ MQTT клиент не подключен');
            return false;
        }

        const topic = `${this.config.publishTopic}/${deviceId}/data`;
        const message = JSON.stringify({
            ...data,
            timestamp: new Date().toISOString(),
            client_id: this.config.clientId
        });

        this.client.publish(topic, message, { qos: 1 }, (error) => {
            if (error) {
                console.error('❌ Ошибка публикации:', error);
            } else {
                console.log(`📤 Опубликовано в ${topic}:`, data);
            }
        });

        return true;
    }

    /**
     * Установка callback функций
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(`on${event.charAt(0).toUpperCase() + event.slice(1)}`)) {
            this.callbacks[`on${event.charAt(0).toUpperCase() + event.slice(1)}`] = callback;
        }
    }

    /**
     * Получение статуса подключения
     */
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            clientId: this.config.clientId,
            broker: `${this.config.host}:${this.config.port}`,
            topic: this.config.topic
        };
    }

    /**
     * Тестовая отправка данных
     */
    sendTestData(deviceId = 'test-device') {
        const testData = {
            device_id: deviceId,
            speed: Math.round(Math.random() * 50),
            fuel: Math.round(Math.random() * 100),
            temperature: Math.round(Math.random() * 50 + 20),
            latitude: 55.7558 + (Math.random() - 0.5) * 0.01,
            longitude: 37.6176 + (Math.random() - 0.5) * 0.01,
            status: Math.random() > 0.5 ? 'active' : 'idle'
        };

        return this.publish(deviceId, testData);
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FarmMQTTClient;
} else {
    window.FarmMQTTClient = FarmMQTTClient;
} 