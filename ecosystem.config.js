module.exports = {
  apps: [
    {
      name: 'farm-monitor-pro',
      script: './server.js',
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
      
      // Переменные окружения
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        RATE_LIMIT_WINDOW_MS: 900000, // 15 минут
        RATE_LIMIT_MAX_REQUESTS: 100
      },
      
      // Настройки перезапуска
      watch: false, // Отключено для production
      ignore_watch: ['node_modules', 'logs', '.git', '.env'],
      autorestart: true,
      max_restarts: 5, // Снижено для избежания зацикливания
      min_uptime: '30s', // Увеличено
      restart_delay: 2000, // Увеличено
      exp_backoff_restart_delay: 100,
      
      // Настройки логов
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_type: 'json',
      
      // Ограничения ресурсов
      max_memory_restart: '512M', // Увеличено
      
      // Мониторинг
      merge_logs: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      
      // Дополнительные настройки для production
      source_map_support: false,
      instance_var: 'INSTANCE_ID',
      
      // Health check
      health_check_grace_period: 30000,
      
      // Настройки Node.js
      node_args: [
        '--max-old-space-size=512'
      ]
    }
  ],

  // Настройки развертывания
  deploy: {
    production: {
      user: 'www-data', // Более безопасный пользователь
      host: ['147.45.213.22'], // IP вашего Timeweb сервера
      ref: 'origin/main',
      repo: 'https://github.com/iForza/fleetTimeweb.git',
      path: '/var/www/farm-monitor',
      ssh_options: "StrictHostKeyChecking=no",
      'pre-deploy-local': '',
      'post-deploy': `
        npm ci --only=production && 
        npm run pm2:restart && 
        pm2 save &&
        echo "✅ Deployment completed successfully"
      `,
      'pre-setup': `
        apt-get update && 
        apt-get install -y git nodejs npm nginx &&
        npm install -g pm2 &&
        mkdir -p /var/www/farm-monitor/logs &&
        chown -R www-data:www-data /var/www/farm-monitor
      `,
      'post-setup': 'ls -la && pm2 startup',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    
    staging: {
      user: 'www-data',
      host: ['staging-server-ip'],
      ref: 'origin/staging',
      repo: 'https://github.com/iForza/fleetTimeweb.git',
      path: '/var/www/farm-monitor-staging',
      'post-deploy': 'npm ci && pm2 startOrRestart ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
        PORT: 3001
      }
    }
  }
}; 