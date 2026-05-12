/**
 * File Utilities — Robust file path resolution for SQLite databases
 *
 * Handles the case where files are uploaded on one environment (with one cwd)
 * and queried on another (with a different cwd), or where the data/ directory
 * doesn't exist yet (fresh deployment).
 *
 * Strategy:
 * - Store only the FILENAME (e.g., "uuid_clinica_demo.sqlite") in the DB
 * - At runtime, resolve the full path from process.cwd()/data/
 * - For backward compatibility, if the stored path is absolute and exists, use it
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get the absolute path to the data directory.
 * Creates it if it doesn't exist.
 *
 * Resolution order:
 * 1. DATA_DIR environment variable (if set) — allows persistent volume mount
 * 2. {cwd}/data/ — default for local development
 */
export function getDataDir(): string {
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

/**
 * Resolve a file path stored in the database to an actual file system path.
 *
 * The stored path could be:
 * 1. Just a filename (new format): "uuid_clinica_demo.sqlite"
 * 2. An absolute path (old format): "/home/z/my-project/data/uuid_clinica_demo.sqlite"
 * 3. A relative path: "data/uuid_clinica_demo.sqlite"
 *
 * Resolution order:
 * 1. If the stored path is absolute AND the file exists → use it
 * 2. Try {cwd}/data/{filename} → if exists, use it
 * 3. Try {cwd}/data/{basename of stored path} → if exists, use it
 * 4. Return the best guess path (even if it doesn't exist, for error messages)
 *
 * @param storedPath - The file path as stored in the DataSource record
 * @returns The resolved absolute file path
 * @throws Error if the file cannot be found
 */
export function resolveFilePath(storedPath: string): string {
  if (!storedPath) {
    throw new Error('No file path provided for data source');
  }

  const dataDir = getDataDir();

  // Strategy 1: If stored path is absolute and file exists, use it
  if (path.isAbsolute(storedPath) && fs.existsSync(storedPath)) {
    console.log(`[FileUtils] Resolved via absolute path: ${storedPath}`);
    return storedPath;
  }

  // Extract just the filename from the stored path
  const filename = path.basename(storedPath);

  // Strategy 2: Try {cwd}/data/{filename}
  const candidatePath = path.join(dataDir, filename);
  if (fs.existsSync(candidatePath)) {
    console.log(`[FileUtils] Resolved via data dir: ${candidatePath} (storedPath="${storedPath}", cwd="${process.cwd()}")`);
    return candidatePath;
  }

  // Strategy 3: If stored path is relative (e.g., "data/xxx.sqlite"), try resolving from cwd
  if (!path.isAbsolute(storedPath)) {
    const relativePath = path.join(process.cwd(), storedPath);
    if (fs.existsSync(relativePath)) {
      console.log(`[FileUtils] Resolved via relative path: ${relativePath}`);
      return relativePath;
    }
  }

  // File not found — provide a helpful error message
  const checkedPaths = [
    storedPath,
    candidatePath,
  ].filter((p, i, arr) => arr.indexOf(p) === i); // deduplicate

  console.error(`[FileUtils] FILE NOT FOUND: storedPath="${storedPath}", cwd="${process.cwd()}", dataDir="${dataDir}", checkedPaths=[${checkedPaths.join(', ')}]`);

  throw new Error(
    `Database file not found. Checked paths: ${checkedPaths.join(', ')}. ` +
    `cwd=${process.cwd()}. The file may have been lost during deployment. Please re-upload the database file.`
  );
}

/**
 * Check if a file exists at the stored path (without throwing).
 * Returns the resolved path if found, or null if not found.
 */
export function findFilePath(storedPath: string): string | null {
  try {
    return resolveFilePath(storedPath);
  } catch {
    return null;
  }
}

/**
 * Generate a storage path for a new file upload.
 * Returns ONLY the filename (not the full path), which will be resolved at runtime.
 *
 * @param filename - The original filename from the upload
 * @returns An object with { storageFilename, fullPath }
 */
export function generateStoragePath(filename: string): { storageFilename: string; fullPath: string } {
  const id = uuidv4();
  const storageFilename = `${id}_${filename}`;
  const dataDir = getDataDir();
  const fullPath = path.join(dataDir, storageFilename);

  return { storageFilename, fullPath };
}

/**
 * Get the display filename (just the basename, for UI purposes).
 */
export function getDisplayFilename(storedPath: string): string {
  return path.basename(storedPath);
}
