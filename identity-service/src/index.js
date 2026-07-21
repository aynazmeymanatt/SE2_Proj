const { createApp } = require("./app");

const PORT = process.env.PORT || 3002;
createApp().listen(PORT, () => console.log(`Identity service (stub) listening on ${PORT}`));
