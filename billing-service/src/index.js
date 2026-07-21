const { createApp } = require("./app");

const PORT = process.env.PORT || 3004;
createApp().listen(PORT, () => console.log(`Billing service (stub) listening on ${PORT}`));
