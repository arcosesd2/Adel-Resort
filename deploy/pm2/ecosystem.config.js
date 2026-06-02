module.exports = {
  apps: [
    {
      name: 'adel-frontend',
      exec_mode: 'fork',
      cwd: '/home/adel/adel-beach-resort/frontend',
      script: 'node_modules/.bin/next',
      args: 'start --hostname 127.0.0.1',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '127.0.0.1',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/pm2/adel-frontend-error.log',
      out_file: '/var/log/pm2/adel-frontend-out.log',
    },
  ],
};
