import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const router = express.Router();

/**
 * Proxy route to bypass X-Frame-Options by stripping security headers 
 * and rewriting relative links to absolute ones where possible.
 */
router.get("/", async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send("URL parameter is required");
    }

    try {
        console.log(`[PROXY] Fetching: ${targetUrl}`);

        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            timeout: 15000,
        });

        const $ = cheerio.load(response.data);
        const originUrl = new URL(targetUrl).origin;

        // Strip security meta tags and CSP
        $('meta[http-equiv="Content-Security-Policy"]').remove();
        $('meta[http-equiv="X-Frame-Options"]').remove();
        $('meta[name="referrer"]').attr('content', 'no-referrer');

        // Inject Base Tag - CRITICAL for relative assets
        $('head').prepend(`<base href="${originUrl}/">`);

        // Inject script to handle common frame-busting and cross-origin link issues
        $('head').append(`
            <script>
                // Prevent frame-busting
                window.onbeforeunload = function() { return false; };
                window.top = window.self;
                
                // Intercept clicks to prevent top-level navigation
                document.addEventListener('click', function(e) {
                    const target = e.target.closest('a');
                    if (target && target.href && !target.href.startsWith('javascript:')) {
                        // For now we just let them click, but in-app we might want to prevent escape
                        // target.target = '_self'; 
                    }
                }, true);
            </script>
        `);

        // Set response headers to allow iframing
        res.setHeader('Content-Type', 'text/html');
        // Clear conflicting headers
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.setHeader('X-Frame-Options', 'ALLOWALL');
        res.removeHeader('frame-ancestors');

        res.send($.html());
    } catch (error) {
        console.error(`[PROXY ERROR] Failed to fetch ${targetUrl}:`, error.message);
        res.status(500).send(`
            <div style="font-family: sans-serif; padding: 2rem; text-align: center; color: #64748b;">
                <h3>Live Preview Unavailable</h3>
                <p>The platform security measures blocked this specific live view attempt.</p>
                <p style="font-size: 0.8rem; margin-top: 1rem;">Reason: ${error.message}</p>
            </div>
        `);
    }
});

export default router;
