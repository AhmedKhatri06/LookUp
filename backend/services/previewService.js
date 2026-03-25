import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = process.platform === 'win32';

/**
 * Finds a valid Chrome/Edge executable on Windows if the Puppeteer bundle is missing.
 */
function getExecutablePath() {
    if (!isWindows) return undefined;
    const paths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const p of paths) {
        if (fs.existsSync(p)) return p;
    }
    return undefined;
}

let browserInstance = null;
let browserPromise = null;

/**
 * Gets or initializes a singleton headless browser instance.
 */
async function getBrowser() {
    if (browserInstance && browserInstance.connected) {
        return browserInstance;
    }

    if (browserPromise) {
        return browserPromise;
    }

    browserPromise = (async () => {
        console.log('[PreviewService] Launching singleton browser instance...');
        const executablePath = getExecutablePath();

        try {
            const browser = await puppeteer.launch({
                headless: 'new',
                executablePath: executablePath || undefined,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1280,1024'
                ]
            });

            console.log('[PreviewService] Browser launched successfully.');

            browser.on('disconnected', () => {
                console.log('[PreviewService] Browser disconnected. Resetting instance.');
                browserInstance = null;
                browserPromise = null;
            });

            browserInstance = browser;
            return browser;
        } catch (err) {
            console.error('[PreviewService] Failed to launch browser:', err.message);
            browserPromise = null;
            throw err;
        }
    })();

    return browserPromise;
}

/**
 * Capture a screenshot of a given URL.
 */
export async function captureScreenshot(url, options = {}) {
    const {
        width = 1280,
        height = 1024,
        isMobile = false,
        fullPage = false
    } = options;

    let page = null;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();

        // Configure viewport
        await page.setViewport({
            width,
            height,
            isMobile,
            deviceScaleFactor: 1
        });

        // Set User Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Block unnecessary resources
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['font', 'texttrack', 'object', 'beacon', 'csp_report', 'imageset'].includes(resourceType)) {
                req.abort();
            } else {
                const reqUrl = req.url().toLowerCase();
                if (reqUrl.includes('google-analytics') || reqUrl.includes('doubleclick') || reqUrl.includes('adsystem')) {
                    req.abort();
                } else {
                    req.continue();
                }
            }
        });

        // Navigate with timeout
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wikipedia optimization
        if (url.includes('wikipedia.org')) {
            await page.addStyleTag({
                content: `
                    header, footer, .vector-header-container, #mw-navigation, 
                    .vector-menu, .mw-footer, #siteNavigation, #jump-to-nav, 
                    .search-box, .banner-container, .notice, .navbox, 
                    .catlinks, .printfooter, .mw-editsection {
                        display: none !important;
                    }

                    body, .mw-body, #content {
                        margin: 0 !important;
                        padding: 20px !important;
                        width: 100% !important;
                        max-width: none !important;
                        background: white !important;
                    }
                    
                    .mw-page-container, .mw-content-container {
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                `
            });
        }

        // Generic cleanup
        await page.addStyleTag({
            content: `
                div[id*="cookie"], div[class*="cookie"], div[id*="consent"], div[class*="consent"] {
                    display: none !important;
                }
            `
        });

        // Capture screenshot
        const screenshot = await page.screenshot({
            type: 'png',
            encoding: 'base64',
            fullPage
        });

        return `data:image/png;base64,${screenshot}`;

    } catch (err) {
        console.error(`[PreviewService] Error capturing screenshot for ${url}:`, err.message);
        throw err;
    } finally {
        if (page) {
            try { await page.close(); } catch (e) { }
        }
    }
}

// Graceful cleanup on exit
process.on('SIGINT', async () => {
    if (browserInstance) {
        await browserInstance.close();
    }
    process.exit();
});
