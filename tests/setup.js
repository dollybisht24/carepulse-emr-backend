const mongoose = require('mongoose');
const env = require('../config/env');

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGO_URI);
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});
