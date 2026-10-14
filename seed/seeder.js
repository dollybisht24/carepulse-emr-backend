const mongoose = require('mongoose');
const env = require('../config/env');
const {
  User,
  Doctor,
  Department,
  Patient,
  Schedule,
  Slot,
  Appointment,
  AuditLog,
} = require('../models');

const seedData = async () => {
  try {
    console.log('[Seeder] Connecting to MongoDB...');
    await mongoose.connect(env.MONGO_URI);
    console.log('[Seeder] Connected successfully. Clearing previous data...');

    // Clear existing collections
    await Promise.all([
      User.deleteMany({}),
      Doctor.deleteMany({}),
      Department.deleteMany({}),
      Patient.deleteMany({}),
      Schedule.deleteMany({}),
      Slot.deleteMany({}),
      Appointment.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    // Ensure database indexes are created
    console.log('[Seeder] Creating database indexes...');
    await Promise.all([
      User.createIndexes(),
      Doctor.createIndexes(),
      Department.createIndexes(),
      Patient.createIndexes(),
      Schedule.createIndexes(),
      Slot.createIndexes(),
      Appointment.createIndexes(),
      AuditLog.createIndexes(),
    ]);

    console.log('[Seeder] Seeding Departments...');
    const [deptCardio, deptOrtho, deptPedia, deptNeuro, deptGen] = await Department.create([
      { name: 'Cardiology', description: 'Comprehensive heart & cardiovascular care' },
      { name: 'Orthopedics', description: 'Bone, joint & musculoskeletal disorders' },
      { name: 'Pediatrics', description: 'Infant, child & adolescent healthcare' },
      { name: 'Neurology', description: 'Brain, spine & nervous system medicine' },
      { name: 'General Medicine', description: 'Primary care & general wellness' },
    ]);

    console.log('[Seeder] Seeding Staff & Doctors Users...');
    // Seed Admin
    const adminPasswordHash = await User.hashPassword('Admin@123');
    const adminUser = await User.create({
      name: 'Dr. Sarah Jenkins (Super Admin)',
      email: 'admin@hospital.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
    });

    // Seed Receptionist
    const receptPasswordHash = await User.hashPassword('Recept@123');
    const receptionistUser = await User.create({
      name: 'Emily Watson (Lead Receptionist)',
      email: 'receptionist@hospital.com',
      passwordHash: receptPasswordHash,
      role: 'receptionist',
    });

    // Seed Doctor Users
    const doctorPasswordHash = await User.hashPassword('Doctor@123');

    const doctorUser1 = await User.create({
      name: 'Dr. Alexander Smith',
      email: 'doctor.smith@hospital.com',
      passwordHash: doctorPasswordHash,
      role: 'doctor',
    });

    const doctorUser2 = await User.create({
      name: 'Dr. Rachel Jones',
      email: 'doctor.jones@hospital.com',
      passwordHash: doctorPasswordHash,
      role: 'doctor',
    });

    const doctorUser3 = await User.create({
      name: 'Dr. Vikram Patel',
      email: 'doctor.patel@hospital.com',
      passwordHash: doctorPasswordHash,
      role: 'doctor',
    });

    console.log('[Seeder] Seeding Doctor Profiles...');
    const doctor1 = await Doctor.create({
      userId: doctorUser1._id,
      departmentId: deptCardio._id,
      specialization: 'Senior Interventional Cardiologist',
      roomNumber: 'OPD-204 (Heart Center)',
      consultationFee: 800,
    });

    const doctor2 = await Doctor.create({
      userId: doctorUser2._id,
      departmentId: deptOrtho._id,
      specialization: 'Orthopedic & Joint Surgeon',
      roomNumber: 'OPD-108 (Ortho Wing)',
      consultationFee: 750,
    });

    const doctor3 = await Doctor.create({
      userId: doctorUser3._id,
      departmentId: deptPedia._id,
      specialization: 'Consultant Pediatrician',
      roomNumber: 'OPD-302 (Child Care)',
      consultationFee: 600,
    });

    console.log('[Seeder] Seeding Doctor Working Schedules...');
    await Schedule.create([
      {
        doctorId: doctor1._id,
        workingDays: [1, 2, 3, 4, 5], // Mon to Fri
        sessions: [
          { sessionName: 'Morning Session', startTime: '09:00', endTime: '12:00' },
          { sessionName: 'Afternoon Session', startTime: '13:00', endTime: '17:00' },
        ],
        breaks: [{ breakName: 'Lunch Break', startTime: '12:00', endTime: '13:00' }],
        slotDuration: 15,
      },
      {
        doctorId: doctor2._id,
        workingDays: [1, 2, 3, 4, 5, 6], // Mon to Sat
        sessions: [
          { sessionName: 'Morning Session', startTime: '10:00', endTime: '13:00' },
          { sessionName: 'Afternoon Session', startTime: '14:00', endTime: '18:00' },
        ],
        breaks: [{ breakName: 'Lunch & Ward Rounds', startTime: '13:00', endTime: '14:00' }],
        slotDuration: 20,
      },
      {
        doctorId: doctor3._id,
        workingDays: [1, 2, 3, 4, 5], // Mon to Fri
        sessions: [
          { sessionName: 'Morning OPD', startTime: '09:00', endTime: '12:30' },
          { sessionName: 'Afternoon OPD', startTime: '13:30', endTime: '16:30' },
        ],
        breaks: [{ breakName: 'Lunch Break', startTime: '12:30', endTime: '13:30' }],
        slotDuration: 15,
      },
    ]);

    console.log('[Seeder] Seeding Sample Patients...');
    const [patient1, patient2, patient3, patient4] = await Patient.create([
      {
        patientId: 'PAT-2026-1001',
        name: 'Johnathan Doe',
        mobile: '9876543210',
        gender: 'male',
        dateOfBirth: new Date('1988-04-12'),
        bloodGroup: 'O+',
        address: '24 Elm Street, Downtown',
        emergencyContact: 'Jane Doe (+91 9876543211)',
      },
      {
        patientId: 'PAT-2026-1002',
        name: 'Maria Garcia',
        mobile: '9812345678',
        gender: 'female',
        dateOfBirth: new Date('1995-09-23'),
        bloodGroup: 'A+',
        address: '89 Rosewood Ave, Westend',
        emergencyContact: 'Carlos Garcia (+91 9812345679)',
      },
      {
        patientId: 'PAT-2026-1003',
        name: 'David Kumar',
        mobile: '9845678901',
        gender: 'male',
        dateOfBirth: new Date('1974-11-05'),
        bloodGroup: 'B+',
        address: '12 Lake View Road, Sector 4',
        emergencyContact: 'Sunita Kumar (+91 9845678902)',
      },
      {
        patientId: 'PAT-2026-1004',
        name: 'Priya Sharma',
        mobile: '9765432109',
        gender: 'female',
        dateOfBirth: new Date('2001-02-18'),
        bloodGroup: 'AB+',
        address: '45 Sunset Boulevard, Sector 9',
        emergencyContact: 'Rohan Sharma (+91 9765432108)',
      },
    ]);

    console.log('[Seeder] Seeding Initial Appointments & Reserved Slots...');
    // Today's date in YYYY-MM-DD
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Seed an appointment for Dr. Smith today at 10:00 - 10:15
    const slot1Start = new Date(`${todayStr}T10:00:00.000Z`);
    const slot1End = new Date(`${todayStr}T10:15:00.000Z`);

    const appt1 = await Appointment.create({
      patientId: patient1._id,
      doctorId: doctor1._id,
      departmentId: deptCardio._id,
      startAt: slot1Start,
      endAt: slot1End,
      status: 'scheduled',
      purpose: 'Routine cardiovascular checkup and ECG evaluation',
      bookedBy: receptionistUser._id,
    });

    await Slot.create({
      doctorId: doctor1._id,
      startAt: slot1Start,
      endAt: slot1End,
      status: 'booked',
      appointmentId: appt1._id,
    });

    // Seed a second appointment for Dr. Smith today at 10:30 - 10:45 (Arrived)
    const slot2Start = new Date(`${todayStr}T10:30:00.000Z`);
    const slot2End = new Date(`${todayStr}T10:45:00.000Z`);

    const appt2 = await Appointment.create({
      patientId: patient2._id,
      doctorId: doctor1._id,
      departmentId: deptCardio._id,
      startAt: slot2Start,
      endAt: slot2End,
      status: 'arrived',
      purpose: 'Mild palpitations and blood pressure monitoring',
      bookedBy: receptionistUser._id,
      arrivedAt: new Date(),
    });

    await Slot.create({
      doctorId: doctor1._id,
      startAt: slot2Start,
      endAt: slot2End,
      status: 'booked',
      appointmentId: appt2._id,
    });

    // Seed a third appointment for Dr. Jones (Orthopedics) today at 11:00 - 11:20 (Completed)
    const slot3Start = new Date(`${todayStr}T11:00:00.000Z`);
    const slot3End = new Date(`${todayStr}T11:20:00.000Z`);

    const appt3 = await Appointment.create({
      patientId: patient3._id,
      doctorId: doctor2._id,
      departmentId: deptOrtho._id,
      startAt: slot3Start,
      endAt: slot3End,
      status: 'completed',
      purpose: 'Right knee pain after sports injury',
      consultationNotes: 'Mild ligament strain diagnosed. Prescribed NSAIDs and rest for 7 days. Physiotherapy referral given.',
      bookedBy: receptionistUser._id,
      arrivedAt: new Date(slot3Start.getTime() - 15 * 60000),
      completedAt: new Date(slot3End.getTime()),
    });

    await Slot.create({
      doctorId: doctor2._id,
      startAt: slot3Start,
      endAt: slot3End,
      status: 'booked',
      appointmentId: appt3._id,
    });

    console.log('[Seeder] Seeding Audit Logs...');
    await AuditLog.create([
      {
        userId: adminUser._id,
        userEmail: adminUser.email,
        role: adminUser.role,
        action: 'SYSTEM_INITIALIZATION',
        entityType: 'System',
        details: { message: 'Seed data generated successfully' },
        timestamp: new Date(),
      },
      {
        userId: receptionistUser._id,
        userEmail: receptionistUser.email,
        role: receptionistUser.role,
        action: 'APPOINTMENT_CREATED',
        entityType: 'Appointment',
        entityId: appt1._id.toString(),
        details: { patientName: patient1.name, doctorName: 'Dr. Alexander Smith' },
        timestamp: new Date(),
      },
    ]);

    console.log('===========================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('===========================================================');
    console.log('Demo Login Credentials:');
    console.log('  👑 Super Admin:  admin@hospital.com       / Admin@123');
    console.log('  📋 Receptionist: receptionist@hospital.com / Recept@123');
    console.log('  🩺 Doctor 1:     doctor.smith@hospital.com / Doctor@123 (Cardiology)');
    console.log('  🩺 Doctor 2:     doctor.jones@hospital.com / Doctor@123 (Orthopedics)');
    console.log('  🩺 Doctor 3:     doctor.patel@hospital.com / Doctor@123 (Pediatrics)');
    console.log('===========================================================');

    process.exit(0);
  } catch (error) {
    console.error('[Seeder Failed]:', error);
    process.exit(1);
  }
};

seedData();
