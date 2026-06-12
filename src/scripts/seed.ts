import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db';
import User from '../models/User';

async function seed() {
  await connectDB();

  const email = 'admin@legalai.ng';
  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`User already exists: ${email}`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash('Admin1234!', 12);

  const user = await User.create({
    name: 'Admin User',
    email,
    passwordHash,
    role: 'admin',
  });

  console.log('\n✅ Admin user seeded successfully');
  console.log('─────────────────────────────');
  console.log(`  Name  : ${user.name}`);
  console.log(`  Email : ${user.email}`);
  console.log(`  Pass  : Admin1234!`);
  console.log(`  Role  : ${user.role}`);
  console.log('─────────────────────────────\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
