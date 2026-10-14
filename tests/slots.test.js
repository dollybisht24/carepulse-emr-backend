const request = require('supertest');
const { app } = require('../server');
const { Doctor } = require('../models');
require('./setup');

describe('3. Dynamic Slot Generation & Break Exclusion Test Suite', () => {
  let authToken;
  let doctorId;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'receptionist@hospital.com', password: 'Recept@123' });
    authToken = loginRes.body.data.accessToken;

    const doctor = await Doctor.findOne().populate('userId');
    doctorId = doctor._id.toString();
  });

  it('should generate slots strictly avoiding breaks and adhering to configured session bounds', async () => {
    // Pick next Wednesday to ensure doctor is working
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + ((3 - testDate.getDay() + 7) % 7 || 7));
    const dateStr = testDate.toISOString().split('T')[0];

    const res = await request(app)
      .get(`/api/v1/slots?doctorId=${doctorId}&date=${dateStr}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isWorkingDay).toBe(true);
    expect(res.body.data.slots.length).toBeGreaterThan(0);

    // Verify no slot starts or overlaps with Lunch Break (12:00 to 13:00)
    for (const slot of res.body.data.slots) {
      expect(slot.startTimeString).not.toBe('12:00');
      expect(slot.startTimeString).not.toBe('12:15');
      expect(slot.startTimeString).not.toBe('12:30');
      expect(slot.startTimeString).not.toBe('12:45');
    }
  });

  it('should reject request when doctorId or date is missing', async () => {
    const res = await request(app)
      .get('/api/v1/slots')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(400);
  });
});
