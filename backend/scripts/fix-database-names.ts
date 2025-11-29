/**
 * Script to fix database names with leading/trailing whitespace
 * Run with: npx ts-node scripts/fix-database-names.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const STORAGE_FILE = path.join(__dirname, '../database/connections.json');

interface Connection {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  lastConnected?: string;
}

interface ConnectionStorage {
  connections: Connection[];
}

function fixDatabaseNames() {
  console.log('🔧 Fixing database names with whitespace issues...\n');

  if (!fs.existsSync(STORAGE_FILE)) {
    console.log('❌ Connections file not found:', STORAGE_FILE);
    process.exit(1);
  }

  const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
  const storage: ConnectionStorage = JSON.parse(data);

  let fixedCount = 0;
  const fixes: string[] = [];

  storage.connections.forEach((conn) => {
    const originalDatabase = conn.database;
    const trimmedDatabase = originalDatabase.trim();

    if (originalDatabase !== trimmedDatabase) {
      fixes.push(
        `  - "${conn.name}": "${originalDatabase}" → "${trimmedDatabase}"`,
      );
      conn.database = trimmedDatabase;
      conn.updatedAt = new Date().toISOString();
      fixedCount++;
    }
  });

  if (fixedCount === 0) {
    console.log('✅ No database names need fixing!');
    return;
  }

  console.log(`📝 Found ${fixedCount} connection(s) with database name issues:\n`);
  fixes.forEach((fix) => console.log(fix));

  // Backup original file
  const backupFile = STORAGE_FILE + '.backup.' + Date.now();
  fs.writeFileSync(backupFile, data);
  console.log(`\n💾 Backup created: ${path.basename(backupFile)}`);

  // Write fixed data
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
  console.log(`✅ Fixed ${fixedCount} connection(s)`);
  console.log('\n💡 Remember to reconnect to these databases after the fix!');
}

fixDatabaseNames();

