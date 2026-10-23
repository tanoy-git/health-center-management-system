const { execSync } = require('child_process');
const path = require('path');

const backendDir = path.resolve(__dirname, '..');

console.log('\n=======================================================');
console.log(' [Production Startup] CareWaves Backend Initializing...');
console.log('=======================================================');

// 1. Synchronize PostgreSQL database schema (DDL)
try {
  console.log('-> [1/3] Synchronizing PostgreSQL database schema (DDL)...');
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: backendDir,
    stdio: 'inherit',
    env: process.env,
  });
  console.log('✅ Schema push completed successfully.');
} catch (err) {
  console.error('❌ Failed to synchronize Prisma schema:', err.message);
  process.exit(1);
}

// 2. Conditionally Seed / Push Dummy Data (DML)
// Controlled by SEED_DUMMY_DATA environment variable (set to 'true' in Render)
const seedRequested =
  process.env.SEED_DUMMY_DATA === 'true' ||
  process.env.SEED_DUMMY_DATA === '1' ||
  process.env.PUSH_DUMMY_DATA === 'true' ||
  process.env.SEED_ON_DEPLOY === 'true';

if (seedRequested) {
  console.log('\n-> [2/3] SEED_DUMMY_DATA=true: Pushing dummy / default seed data (DML)...');
  try {
    const seedScript = path.join(backendDir, 'dist', 'prisma', 'seed.js');
    execSync(`node "${seedScript}"`, {
      cwd: backendDir,
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✅ Dummy seed data pushed successfully!\n');
  } catch (seedErr) {
    console.warn('⚠️  Warning: Seed script encountered an error, continuing startup:', seedErr.message);
  }
} else {
  console.log('\n-> [2/3] SEED_DUMMY_DATA is not enabled. Skipping dummy data push.');
  console.log('   💡 TIP: To push dummy data on deploy, set SEED_DUMMY_DATA=true in Render Environment Variables.');
  console.log('   💡 TIP: To disable dummy data push, set SEED_DUMMY_DATA=false or remove the variable.\n');
}

// 3. Start NestJS production HTTP server
console.log('-> [3/3] Starting NestJS production server...');
require(path.join(backendDir, 'dist', 'src', 'main.js'));
