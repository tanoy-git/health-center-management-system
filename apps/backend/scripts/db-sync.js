const { execSync } = require('child_process');
const path = require('path');

const backendDir = path.resolve(__dirname, '..');

console.log('\n=======================================================');
console.log(' [DB-Sync] CareWaves Auto Schema (DDL) & Data (DML) Sync');
console.log('=======================================================');

try {
  // 1. Push schema changes (DDL) to the database
  console.log('-> [1/3] Synchronizing PostgreSQL database schema (DDL)...');
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: backendDir,
    stdio: 'inherit',
    env: process.env,
  });

  // 2. Generate Prisma Client bindings
  console.log('-> [2/3] Generating Prisma Client bindings...');
  try {
    const genOutput = execSync('npx prisma generate', {
      cwd: backendDir,
      encoding: 'utf8',
      env: process.env,
    });
    console.log(genOutput.trim());
  } catch (genErr) {
    const errMsg = (genErr.stdout || '') + (genErr.stderr || '') + (genErr.message || '');
    if (errMsg.includes('EPERM') || errMsg.includes('query_engine')) {
      console.warn('⚠️  [Notice] Prisma Client DLL is locked by a running process on Windows. Schema was pushed successfully.');
    } else {
      throw genErr;
    }
  }

  // 3. Seed / sync default DML data (permissions, system roles, catalogs)
  console.log('-> [3/3] Synchronizing system roles, permissions & catalog (DML)...');
  execSync('npx ts-node prisma/seed.ts', {
    cwd: backendDir,
    stdio: 'inherit',
    env: process.env,
  });

  console.log('✅ [DB-Sync] Database schema & DML seeds are fully up to date!\n');
} catch (error) {
  console.error('\n❌ [DB-Sync Error] Failed to synchronize database:');
  if (error.stdout) console.error(error.stdout.toString());
  if (error.stderr) console.error(error.stderr.toString());
  console.error(error.message);
  console.error('\n👉 Please make sure PostgreSQL is running:');
  console.error('   Run: npm run docker:postgres\n');
  process.exit(1);
}
