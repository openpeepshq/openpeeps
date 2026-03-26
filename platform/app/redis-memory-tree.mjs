#!/usr/bin/env node

/**
 * Shows memory usage for every prefix and subprefix in Redis as a tree
 * 
 * Usage:
 *   pnpm redis:memory
 *   node redis-memory-tree.mjs
 */

import { createClient } from 'redis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env and local.env files
// Try local.env first (if it exists), then .env
const localEnvPath = join(__dirname, 'local.env');
const envPath = join(__dirname, '.env');

if (existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
}
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Format bytes to human readable format
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Parse key into prefix parts
function parseKey(key) {
  const separator = ':';
  const parts = key.split(separator);
  return parts;
}

// Build tree structure from keys and their memory usage
function buildTree(keysWithMemory) {
  const tree = {};

  for (const { key, memory } of keysWithMemory) {
    const parts = parseKey(key);
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      const fullPrefix = parts.slice(0, i + 1).join(':');

      if (!current[part]) {
        current[part] = {
          _memory: 0,
          _count: 0,
          _children: {},
        };
      }

      current[part]._memory += memory;
      current[part]._count += 1;

      if (!isLeaf) {
        current = current[part]._children;
      }
    }
  }

  return tree;
}

// Print tree recursively
// Only shows subprefixes with more than one key or using more than 100KB
function printTree(node, prefix = '', isLast = true, depth = 0) {
  const entries = Object.entries(node).filter(([key]) => !key.startsWith('_'));

  if (entries.length === 0) {
    return;
  }

  // Sort by memory usage (descending)
  entries.sort((a, b) => {
    const memA = node[a[0]]._memory;
    const memB = node[b[0]]._memory;
    return memB - memA;
  });

  const MIN_MEMORY_BYTES = 100 * 1024; // 100KB

  // Filter entries to only show those that meet criteria
  // A node is visible if it meets criteria OR has visible children
  const visibleEntries = [];

  for (const [key, value] of entries) {
    const nodeMeetsCriteria = value._count > 1 || value._memory >= MIN_MEMORY_BYTES;
    const hasVisibleChildren = hasVisibleDescendants(value._children, MIN_MEMORY_BYTES);

    if (nodeMeetsCriteria || hasVisibleChildren) {
      visibleEntries.push([key, value, nodeMeetsCriteria]);
    }
  }

  if (visibleEntries.length === 0) {
    return;
  }

  visibleEntries.forEach(([key, value, shouldShow], index) => {
    const isLastEntry = index === visibleEntries.length - 1;
    const connector = isLastEntry ? '└── ' : '├── ';
    const memory = formatBytes(value._memory);
    const count = value._count;
    const displayKey = key || '(empty)';

    // Print node if it meets criteria (has >1 key or >100KB)
    // We show the node even if it only has visible children, to maintain tree structure
    console.log(
      `${prefix}${connector}${displayKey} (${memory}, ${count} key${count !== 1 ? 's' : ''})`
    );

    // Recurse into children with appropriate prefix
    const nextPrefix = prefix + (isLastEntry ? '    ' : '│   ');
    printTree(value._children, nextPrefix, isLastEntry, depth + 1);
  });
}

// Helper function to check if a node has any visible descendants
function hasVisibleDescendants(node, minMemoryBytes) {
  const entries = Object.entries(node).filter(([key]) => !key.startsWith('_'));

  for (const [key, value] of entries) {
    if (value._count > 1 || value._memory >= minMemoryBytes) {
      return true;
    }
    if (hasVisibleDescendants(value._children, minMemoryBytes)) {
      return true;
    }
  }

  return false;
}

// Get memory usage for a key
async function getKeyMemory(redis, key) {
  try {
    // Try MEMORY USAGE command (available in Redis 4.0+)
    // In Redis client v5, use sendCommand with proper format
    let memory;
    if (typeof redis.sendCommand === 'function') {
      // Redis v5: sendCommand takes an array of command parts
      memory = await redis.sendCommand(['MEMORY', 'USAGE', key]);
    } else {
      // Fallback to manual calculation
      throw new Error('MEMORY USAGE not available');
    }
    return memory || 0;
  } catch (error) {
    // Fallback: estimate based on key size and value size
    try {
      const value = await redis.get(key);
      if (value === null) {
        // Try other types
        const type = await redis.type(key);
        if (type === 'hash') {
          const hash = await redis.hGetAll(key);
          return JSON.stringify(hash).length + key.length;
        } else if (type === 'list') {
          const list = await redis.lRange(key, 0, -1);
          return JSON.stringify(list).length + key.length;
        } else if (type === 'set') {
          const set = await redis.sMembers(key);
          return JSON.stringify(set).length + key.length;
        } else if (type === 'zset') {
          const zset = await redis.zRange(key, 0, -1, { WITHSCORES: true });
          return JSON.stringify(zset).length + key.length;
        }
        return key.length;
      }
      return Buffer.byteLength(value, 'utf8') + key.length;
    } catch (err) {
      // If we can't get the value, just return key size
      return key.length;
    }
  }
}

// Scan all keys and get their memory usage
async function scanAllKeys(redis) {
  const keysWithMemory = [];
  let cursor = '0'; // Redis v5: cursor is a string starting with "0"
  let totalScanned = 0;

  console.log('Scanning Redis keys...\n');

  do {
    // Redis v5: Use sendCommand for SCAN to ensure compatibility
    let result;
    try {
      // Try using sendCommand for SCAN with MATCH and COUNT
      result = await redis.sendCommand(['SCAN', cursor, 'MATCH', '*', 'COUNT', '1000']);
    } catch (err) {
      // Fallback to scan method if sendCommand fails
      try {
        result = await redis.scan(cursor, {
          MATCH: '*',
          COUNT: 1000,
        });
      } catch (err2) {
        console.error('Error calling scan:', err2.message);
        break;
      }
    }

    // SCAN returns [cursor, [key1, key2, ...]]
    // Handle different return formats
    let nextCursor, keys;
    if (Array.isArray(result) && result.length >= 2) {
      // Tuple format: [cursor, [keys]]
      nextCursor = result[0];
      keys = Array.isArray(result[1]) ? result[1] : [];
    } else if (result && typeof result === 'object') {
      // Try object format
      if ('cursor' in result) {
        nextCursor = result.cursor;
        keys = Array.isArray(result.keys) ? result.keys : [];
      } else if (result[0] !== undefined) {
        nextCursor = result[0];
        keys = Array.isArray(result[1]) ? result[1] : [];
      } else {
        console.error('Unexpected scan result format:', result);
        break;
      }
    } else {
      console.error('Unexpected scan result type:', typeof result, result);
      break;
    }

    // Ensure cursor and keys are valid
    if (nextCursor === undefined || nextCursor === null || !Array.isArray(keys)) {
      console.error('Invalid scan result:', { nextCursor, keys, result });
      break;
    }

    cursor = String(nextCursor); // Ensure cursor is a string
    totalScanned += keys.length;

    // Process keys in batches to avoid overwhelming Redis
    const batchSize = 100;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const promises = batch.map(async (key) => {
        const memory = await getKeyMemory(redis, key);
        return { key, memory };
      });

      const results = await Promise.all(promises);
      keysWithMemory.push(...results);

      // Show progress
      process.stdout.write(
        `\rScanned ${totalScanned} keys, processed ${keysWithMemory.length} keys...`
      );
    }
  } while (cursor !== '0');

  console.log(`\n\nFound ${keysWithMemory.length} keys total.\n`);

  return keysWithMemory;
}

// Main function
async function main() {
  let client;

  try {
    // Create Redis client
    const clientConfig = {
      socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
      },
    };

    if (REDIS_PASSWORD) {
      clientConfig.password = REDIS_PASSWORD;
    }

    client = createClient(clientConfig);

    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      process.exit(1);
    });

    await client.connect();
    console.log(`Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}\n`);

    // Get all keys with memory usage
    const keysWithMemory = await scanAllKeys(client);

    if (keysWithMemory.length === 0) {
      console.log('No keys found in Redis.');
      return;
    }

    // Build tree structure
    const tree = buildTree(keysWithMemory);

    // Calculate total memory
    const totalMemory = keysWithMemory.reduce((sum, { memory }) => sum + memory, 0);

    // Print tree
    console.log('Memory usage by prefix (tree structure):\n');
    printTree(tree);

    // Print summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Total memory: ${formatBytes(totalMemory)}`);
    console.log(`Total keys: ${keysWithMemory.length}`);
    console.log(`${'='.repeat(60)}\n`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      // Redis v5: use close() instead of disconnect()
      await client.close();
    }
  }
}

main();
