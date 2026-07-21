const { createApp } = require("./app");

const PORT = process.env.PORT || 3005;
createApp().listen(PORT, () => console.log(`Notification service (stub) listening on ${PORT}`));
