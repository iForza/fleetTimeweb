module.exports = {
  apps: [
    {
      name: 'farm-monitor-pro',
      script: './server.js',
      instances: 1, // Можно увеличить для кластера
      exec_mode: 'fork', // или 'cluster' для множественных экземпляров
      
      // Переменные окружения
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // Настройки перезапуска
      watch: false, // Отключено для production
      ignore_watch: ['node_modules', 'logs', '.git'],
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 1000,
      
      // Настройки логов
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Ограничения ресурсов
      max_memory_restart: '500M',
      
      // Мониторинг
      merge_logs: true,
      
      // Настройки для кластера (если нужно)
      // instances: 'max', // Использовать все CPU ядра
      // exec_mode: 'cluster'
    }
  ],

  // Настройки развертывания (опционально)
  deploy: {
    production: {
      user: 'root',
      host: ['147.45.213.22'], // IP вашего Timeweb сервера
      ref: 'origin/main',
      repo: 'https://github.com/iForza/fleetTimeweb.git',
      path: '/var/www/farm-monitor',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run pm2:restart && pm2 save',
      'pre-setup': 'apt-get update && apt-get install -y git nodejs npm',
      'post-setup': 'ls -la'
    }
  }
}; 