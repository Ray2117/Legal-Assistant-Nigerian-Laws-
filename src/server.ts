import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './config/db';
import { initCloudinary } from './config/cloudinary';

const PORT = process.env.PORT || 5000;

async function main() {
  await connectDB();
  initCloudinary();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
