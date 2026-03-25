/**
 * faceVerification.js — Local face verification using DeepFace (Python bridge).
 * 
 * Drop-in replacement for faceVerificationService.js (Gemini-based).
 * Exports the same function signatures: verifyFaceSimilarity, detectHumanFace, batchWithPacing.
 * 
 * Architecture:
 * - Node.js downloads images via axios (reliable, with proper headers)
 * - Saves to temp files
 * - Passes local file paths to the Python DeepFace script
 * - Parses JSON output
 */

import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = process.platform === 'win32';

/**
 * Converts a Windows absolute path to a WSL path (e.g., D:\foo -> /mnt/d/foo)
 */
function toWslPath(winPath) {
    if (!isWindows || !winPath) return winPath;
    const cleanPath = winPath.replace(/\\/g, '/');
    const driveMatch = cleanPath.match(/^([a-zA-Z]):\/(.*)/);
    if (driveMatch) {
        return `/mnt/${driveMatch[1].toLowerCase()}/${driveMatch[2]}`;
    }
    return cleanPath;
}

const PYTHON_SCRIPT = isWindows ? toWslPath(path.join(__dirname, 'face_verify.py')) : path.join(__dirname, 'face_verify.py');
const PYTHON_BIN = process.env.FACE_VERIFY_PYTHON || (isWindows ? 'wsl' : 'python3');
const PYTHON_ARGS_PREFIX = isWindows ? ['python3'] : [];

// Configurable threshold (default: 70%)
const SIMILARITY_THRESHOLD = parseInt(process.env.FACE_SIMILARITY_THRESHOLD || '70', 10);

console.log(`[FaceVerification] Local DeepFace engine active | Python: ${PYTHON_BIN} | Threshold: ${SIMILARITY_THRESHOLD}%`);

// Simple LRU cache for verification results
const verificationCache = new Map();
const MAX_CACHE_SIZE = 100;

function getCacheKey(type, ...urls) {
    return `${type}:${urls.sort().join('|')}`;
}

function setCache(key, value) {
    if (verificationCache.size >= MAX_CACHE_SIZE) {
        const firstKey = verificationCache.keys().next().value;
        verificationCache.delete(firstKey);
    }
    verificationCache.set(key, value);
}

/**
 * Download an image URL to a local temp file.
 * @param {string} url - Image URL
 * @returns {Promise<string|null>} Local file path, or null on failure
 */
async function downloadToTemp(url) {
    if (!url) return null;

    // Handle data URLs
    if (url.startsWith('data:')) {
        try {
            const parts = url.split(',');
            if (parts.length < 2) return null;
            const buffer = Buffer.from(parts[1], 'base64');
            const tmpPath = path.join(os.tmpdir(), `face_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
            fs.writeFileSync(tmpPath, buffer);
            return tmpPath;
        } catch (e) {
            return null;
        }
    }

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Referer': 'https://www.google.com/'
            }
        });

        const ext = url.includes('.png') ? '.png' : '.jpg';
        const tmpPath = path.join(os.tmpdir(), `face_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
        fs.writeFileSync(tmpPath, Buffer.from(response.data));
        return tmpPath;
    } catch (err) {
        console.error(`[FaceVerification] Failed to download image: ${url.substring(0, 60)}... - ${err.message}`);
        return null;
    }
}

/**
 * Clean up temp file.
 */
function cleanupTemp(filePath) {
    if (filePath && fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
    }
}

/**
 * Execute the Python face_verify.py script with given args.
 * @param {string[]} args - Command-line arguments
 * @param {number} timeoutMs - Timeout in ms
 * @returns {Promise<object>} Parsed JSON result
 */
function runPython(args, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const finalArgs = [...PYTHON_ARGS_PREFIX, PYTHON_SCRIPT, ...args.map(a => isWindows ? toWslPath(a) : a)];
        execFile(PYTHON_BIN, finalArgs, {
            timeout: timeoutMs,
            maxBuffer: 1024 * 1024,
            env: {
                ...process.env,
                TF_CPP_MIN_LOG_LEVEL: '3',
                TF_ENABLE_ONEDNN_OPTS: '0'
            }
        }, (error, stdout, stderr) => {
            if (error) {
                if (error.killed) {
                    return reject(new Error(`Python process timed out after ${timeoutMs}ms`));
                }
                if (stdout && stdout.trim()) {
                    try {
                        return resolve(JSON.parse(stdout.trim()));
                    } catch (e) { /* fall through */ }
                }
                return reject(new Error(`Python error: ${error.message} | stderr: ${stderr}`));
            }

            try {
                const result = JSON.parse(stdout.trim());
                return resolve(result);
            } catch (e) {
                return reject(new Error(`Failed to parse Python output: ${stdout}`));
            }
        });
    });
}

/**
 * Utility: Delay for rate-limit pacing
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Run async tasks in batches with a delay between each batch.
 * @param {Array} items - Items to process
 * @param {Function} fn - Async function to apply to each item
 * @param {number} batchSize - Number of concurrent requests per batch
 * @param {number} delayMs - Delay in ms between batches
 * @returns {Promise<Array>} Results
 */
export async function batchWithPacing(items, fn, batchSize = 3, delayMs = 300) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fn));
        results.push(...batchResults);
        if (i + batchSize < items.length) {
            await delay(delayMs);
        }
    }
    return results;
}

/**
 * Compares a candidate image against an identity anchor image using DeepFace.
 * @param {string} anchorUrl URL of the verified anchor image
 * @param {string} candidateUrl URL of the image to verify
 * @returns {Promise<number>} Similarity score (0-100)
 */
export async function verifyFaceSimilarity(anchorUrl, candidateUrl) {
    if (!anchorUrl || !candidateUrl) return 0;

    // Check cache
    const cacheKey = getCacheKey('verify', anchorUrl, candidateUrl);
    if (verificationCache.has(cacheKey)) {
        const cached = verificationCache.get(cacheKey);
        console.log(`[FaceVerification] Cache hit: ${cached.confidence}% - ${candidateUrl.substring(0, 50)}...`);
        return cached.isSamePerson ? cached.confidence : 0;
    }

    let anchorPath = null;
    let candidatePath = null;

    try {
        // Download both images to temp files
        [anchorPath, candidatePath] = await Promise.all([
            downloadToTemp(anchorUrl),
            downloadToTemp(candidateUrl)
        ]);

        if (!anchorPath || !candidatePath) {
            console.warn(`[FaceVerification] Could not download one or both images for verify`);
            return 55; // Fallback to probable match
        }

        const result = await runPython(['verify', anchorPath, candidatePath], 45000);

        if (result.error) {
            console.warn(`[FaceVerification] Verify error: ${result.error}`);
            return 55;
        }

        setCache(cacheKey, result);
        console.log(`[FaceVerification] Similarity: ${result.confidence}% (distance: ${result.distance}) - ${candidateUrl.substring(0, 50)}...`);
        return result.isSamePerson ? result.confidence : 0;
    } catch (error) {
        console.error(`[FaceVerification] Similarity check error: ${error.message}`);
        return 55;
    } finally {
        cleanupTemp(anchorPath);
        cleanupTemp(candidatePath);
    }
}

/**
 * Detects if a given image contains a clear human face.
 * @param {string} imageUrl URL of the image to check
 * @returns {Promise<boolean>} True if a human face is detected
 */
export async function detectHumanFace(imageUrl) {
    if (!imageUrl) return false;

    // Check cache
    const cacheKey = getCacheKey('detect', imageUrl);
    if (verificationCache.has(cacheKey)) {
        const cached = verificationCache.get(cacheKey);
        return cached.hasHumanFace;
    }

    let localPath = null;

    try {
        localPath = await downloadToTemp(imageUrl);
        if (!localPath) {
            console.warn(`[FaceVerification] Could not download image for detection: ${imageUrl.substring(0, 50)}...`);
            return true; // Fallback: assume face exists
        }

        const result = await runPython(['detect', localPath], 20000);

        if (result.error) {
            console.warn(`[FaceVerification] Detection error for ${imageUrl.substring(0, 50)}...: ${result.error}`);
            return true;
        }

        setCache(cacheKey, result);

        if (!result.hasHumanFace) {
            console.log(`[FaceVerification] No face detected in: ${imageUrl.substring(0, 50)}...`);
        }
        return result.hasHumanFace && result.confidence > 50;
    } catch (error) {
        console.error(`[FaceVerification] Face detection error: ${error.message}`);
        return true;
    } finally {
        cleanupTemp(localPath);
    }
}
