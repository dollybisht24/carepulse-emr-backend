const request = require('supertest');
const { app } = require('../server');
require('./setup');

describe('1. Authentication & Security Test Suite', () => {
  it('should successfully log in with valid credentials and return JWT without passwordHash', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@hospital.com',
        password: 'Admin@123',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@hospital.com');
    expect(res.body.data.user.role).toBe('admin');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('should reject login with invalid password (401 Unauthorized)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@hospital.com',
        password: 'WrongPassword!',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject access to protected endpoint without token (401 Unauthorized)', async () => {
    const res = await request(app).get('/api/v1/appointments');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should refresh access token using valid refresh token cookie', async () => {
    // First login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'receptionist@hospital.com',
        password: 'Recept@123',
      });

    const cookies = loginRes.headers['set-cookie'];
    expect(cookies).toBeDefined();

    // Call refresh with cookie
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies);

    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();
  });
});
