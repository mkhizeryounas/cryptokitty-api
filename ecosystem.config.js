module.exports = {
  apps: [
    {
      name: "cryptokitty-api",
      script: "./bin/www",
      env: {
        PORT: 3010,
        NODE_ENV: "development"
      }
    }
  ]
};
