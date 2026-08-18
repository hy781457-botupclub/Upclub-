module.exports = {
  apps: [
    {
      name: 'wingo-panel',
      script: 'index.js',
      instances: 1,
      exec_mode: 'fork',
      restart_delay: 2000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};
