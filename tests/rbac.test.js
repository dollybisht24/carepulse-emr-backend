const request = require('supertest');
const { app } = require('../server');
const { Department } = require('../models');
require('./setup');

describe('2. Role-Based Access Control (RBAC) Test Suite', () => {
  let adminToken;
  let receptionistToken;
  let doctorToken;
  let departmentId;

  beforeAll(async () => {
    // Login as Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@hospital.com', password: 'Admin@123' });
    adminToken = adminRes.body.data.accessToken;

    // Login as Receptionist
    const receptRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'receptionist@hospital.com', password: 'Recept@123' });
    receptionistToken = receptRes.body.data.accessToken;

    // Login as Doctor Smith
    const docRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'doctor.smith@hospital.com', password: 'Doctor@123' });
    doctorToken = docRes.body.data.accessToken;

    const dept = await Department.findOne({ name: 'Cardiology' });
    departmentId = dept._id.toString();
  });

  it('should prevent Receptionist from creating a doctor (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/doctors')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        name: 'Dr. Hacker',
        email: 'hacker@hospital.com',
        password: 'Password@123',
        departmentId,
        specialization: 'General',
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow Super Admin to create a doctor (201 Created)', async () => {
    const uniqueEmail = `dr.new.${Date.now()}@hospital.com`;
    const res = await request(app)
      .post('/api/v1/doctors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Dr. Jennifer Taylor',
        email: uniqueEmail,
        password: 'Password@123',
        departmentId,
        specialization: 'Electrophysiology',
        roomNumber: 'OPD-210',
        consultationFee: 900,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId.email).toBe(uniqueEmail);
  });

  it("should restrict Doctor to ONLY view their own appointments (cannot view other doctors')", async () => {
    // When Dr. Smith asks for appointments, query is scoped automatically
    const res = await request(app)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    // Every appointment returned MUST belong to Dr. Smith
    for (const appt of res.body.data) {
      expect(appt.doctorId.userId.email).toBe('doctor.smith@hospital.com');
    }
  });
});
