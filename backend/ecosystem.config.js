module.exports = {
  apps: [
    {
      name: "quiz-app",
      script: "server.js",
      cwd: "/home/ubuntu/server",       // adjust if your path differs
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      env_production: {
        NODE_ENV: "production"
      }
    }
  ]
};

