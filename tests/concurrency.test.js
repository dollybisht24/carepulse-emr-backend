const request = require('supertest');
const { app } = require('../server');
const { Doctor, Patient, Department } = require('../models');
require('./setup');

describe('4. Concurrency & Zero Double-Booking Prevention Test Suite', () => {
  let receptionistToken;
  let adminToken;
  let doctorId;
  let departmentId;
  let patient1Id;
  let patient2Id;

  beforeAll(async () => {
    // 1. Authenticate two separate staff members
    const [receptRes, adminRes] = await Promise.all([
      request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'receptionist@hospital.com', password: 'Recept@123' }),
      request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@hospital.com', password: 'Admin@123' }),
    ]);

    receptionistToken = receptRes.body.data.accessToken;
    adminToken = adminRes.body.data.accessToken;

    const [doctor, dept, patients] = await Promise.all([
      Doctor.findOne().populate('userId'),
      Department.findOne({ name: 'Cardiology' }),
      Patient.find().limit(2),
    ]);

    doctorId = doctor._id.toString();
    departmentId = dept._id.toString();
    patient1Id = patients[0]._id.toString();
    patient2Id = patients[1]._id.toString();
  });

  it('should handle simultaneous booking attempts for the same slot: EXACTLY ONE succeeds (201) and the other fails with 409 Conflict', async () => {
    // Select a future date and time (14 days ahead on a weekday at 14:00)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    // ensure weekday (Monday if weekend)
    if (futureDate.getDay() === 0) futureDate.setDate(futureDate.getDate() + 1);
    if (futureDate.getDay() === 6) futureDate.setDate(futureDate.getDate() + 2);

    const dateStr = futureDate.toISOString().split('T')[0];
    const startAt = `${dateStr}T14:00:00.000Z`;
    const endAt = `${dateStr}T14:15:00.000Z`;

    const requestPayload1 = {
      patientId: patient1Id,
      doctorId,
      departmentId,
      startAt,
      endAt,
      purpose: 'Cardiovascular checkup - Receptionist 1',
    };

    const requestPayload2 = {
      patientId: patient2Id,
      doctorId,
      departmentId,
      startAt,
      endAt,
      purpose: 'Hypertension consultation - Receptionist 2',
    };

    // Fire BOTH requests simultaneously using Promise.all to simulate concurrent arrival
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send(requestPayload1),
      request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(requestPayload2),
    ]);

    const statuses = [res1.statusCode, res2.statusCode].sort();

    // Verify one succeeded (201) and one conflicted (409)
    expect(statuses).toEqual([201, 409]);

    const successRes = res1.statusCode === 201 ? res1 : res2;
    const conflictRes = res1.statusCode === 409 ? res1 : res2;

    expect(successRes.body.success).toBe(true);
    expect(conflictRes.body.success).toBe(false);
    expect(conflictRes.body.message).toMatch(/no longer available|reserved|booked/i);

    // Save the created appointment ID for cancellation and re-booking test
    const bookedAppointmentId = successRes.body.data._id;

    // Now test cancellation & safe release of the slot:
    const cancelRes = await request(app)
      .delete(`/api/v1/appointments/${bookedAppointmentId}`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ reason: 'Patient requested cancellation' });

    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body.data.status).toBe('cancelled');

    // Now attempt to re-book the EXACT same slot: it MUST succeed now!
    const rebookRes = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(requestPayload2);

    expect(rebookRes.statusCode).toBe(201);
    expect(rebookRes.body.success).toBe(true);
    expect(rebookRes.body.data.status).toBe('scheduled');
  });
});
