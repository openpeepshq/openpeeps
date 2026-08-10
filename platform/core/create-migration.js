#!/usr/bin/env node

import { extractDateFromUUIDv7 } from '@openpeepshq/common';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { uuidv7 } from 'uuidv7';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get command line arguments
const args = process.argv.slice(2);
const migrationName = args[0];
const migrationInfo = args[1];

if (!migrationName || !migrationInfo) {
  console.error(
    'Usage: node create-migration.js <migration-name> <migration-info>',
  );
  console.error(
    'Example: node create-migration.js "add-user-avatar" "Adding avatar field to user profiles"',
  );
  process.exit(1);
}

// Generate UUID for the migration
const uuid = uuidv7();

// Create kebab-case filename
const kebabCaseName = migrationName
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const dateString = extractDateFromUUIDv7(uuid);
// Create the migration file path
const migrationsDir = join(
  __dirname,
  'src',
  'db',
  'dataMigrations',
  'migrations',
);
const migrationFilePath = join(
  migrationsDir,
  `${dateString}-${kebabCaseName}.ts`,
);

// Ensure migrations directory exists
if (!existsSync(migrationsDir)) {
  mkdirSync(migrationsDir, { recursive: true });
}

// Create the migration file content
const migrationContent = `import { Database } from "arangojs";
import { transformDocsInCollection } from "../helpers";

export default {
  key: '${uuid}',
  info: '${migrationInfo}',
  migration: async (db: Database) => {
    // TODO: Implement your migration logic here
    // Example:
    // return transformDocsInCollection(db, 'collectionName', (doc) => {
    //   return {
    //     ...doc,
    //     // your changes here
    //   };
    // });
    
    // Or for simple operations:
    // const collection = db.collection('collectionName');
    // if (await collection.exists()) {
    //   // your migration logic
    // }
  },
};
`;

// Write the migration file
writeFileSync(migrationFilePath, migrationContent);

// Read the migrations.ts file
const migrationsFilePath = join(
  __dirname,
  'src',
  'db',
  'dataMigrations',
  'migrations.ts',
);
const migrationsContent = readFileSync(migrationsFilePath, 'utf8');

// Add import for the new migration
const importStatement = `import ${kebabCaseName.replace(/-([a-z])/g, (g) => g[1].toUpperCase())} from './migrations/${kebabCaseName}';`;

// Find the last import statement and add the new import after it
const importRegex = /import .* from '\.\/migrations\/.*';/g;
const imports = migrationsContent.match(importRegex);
const lastImport = imports ? imports[imports.length - 1] : '';

let newMigrationsContent = migrationsContent;
if (lastImport) {
  newMigrationsContent = migrationsContent.replace(
    lastImport,
    `${lastImport}\n${importStatement}`,
  );
} else {
  // If no existing imports, add after the first import
  const firstImportMatch = migrationsContent.match(/import .* from '.*';/);
  if (firstImportMatch) {
    newMigrationsContent = migrationsContent.replace(
      firstImportMatch[0],
      `${firstImportMatch[0]}\n${importStatement}`,
    );
  }
}

// Add the migration to the dataMigrations array
const migrationObject = `  ${kebabCaseName.replace(/-([a-z])/g, (g) => g[1].toUpperCase())},`;

newMigrationsContent = newMigrationsContent.replace(
  '];',
  `${migrationObject}\n];`,
);

// Write the updated migrations.ts file
writeFileSync(migrationsFilePath, newMigrationsContent);

console.log(`✅ Migration created successfully!`);
console.log(`📁 File: ${migrationFilePath}`);
console.log(`🔑 UUID: ${uuid}`);
console.log(`📝 Info: ${migrationInfo}`);
console.log(`\nNext steps:`);
console.log(`1. Edit ${migrationFilePath} to implement your migration logic`);
console.log(`2. Test your migration`);
console.log(`3. Run the migration when ready`);
