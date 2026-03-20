module.exports = {
  apps: [
    {
      name: "urbannook-admin",
      script: "./index.js",
      watch: false,
      env: {
        NODE_ENV: "development",
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
