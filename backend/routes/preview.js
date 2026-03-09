import express from "express";
import Urlbox from "urlbox";

const router = express.Router();

/**
 * GET /api/preview
 * Generates an interactive Urlbox preview URL for the given target URL.
 */
router.get("/", async (req, res) => {
    try {
        const targetUrl = req.query.url;

        if (!targetUrl) {
            return res.status(400).json({ error: "URL parameter is required" });
        }

        const apiKey = process.env.URLBOX_API_KEY;
        const apiSecret = process.env.URLBOX_API_SECRET;

        if (!apiKey || !apiSecret) {
            console.error("[PREVIEW ERROR] Urlbox API credentials missing.");
            return res.status(500).json({ error: "Server configuration error" });
        }

        const urlbox = Urlbox(apiKey, apiSecret);

        // Inject a script into the URLBox rendering process to intercept
        // authentication links and redirect them to postMessage to our React app.
        const injectedJs = `
            document.addEventListener('click', function(e) {
                const path = e.composedPath ? e.composedPath() : [];
                const isAuthLink = path.some(el => {
                    if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.role === 'button') {
                        const text = (el.innerText || '').toLowerCase();
                        const href = (el.href || '').toLowerCase();
                        return /(login|sign\\s*in|continue\\s*with|oauth|auth|google)/i.test(text) || 
                               /(login|signin|oauth|auth)/i.test(href);
                    }
                    return false;
                });

                if (isAuthLink) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.parent.postMessage({ type: 'URLBOX_AUTH_CLICKED' }, '*');
                }
            }, true);
        `;

        // Generate the URL for interactive HTML preview
        // Note: URLbox 'html' format passes back the raw HTML, effectively bypassing
        // initial X-Frame-Options blocks from the target site.
        const options = {
            url: targetUrl,
            format: 'html',
            block_ads: true,
            hide_cookie_banners: true,
            js: injectedJs
        };

        const previewUrl = urlbox.generateRenderLink(options);

        // Also generate a fallback screenshot URL in case the HTML fails to load or render nicely
        const fallbackOptions = {
            url: targetUrl,
            format: 'png',
            full_page: false,
            width: 1280,
            height: 1024,
            block_ads: true,
            hide_cookie_banners: true
        };

        const fallbackUrl = urlbox.generateRenderLink(fallbackOptions);

        res.json({
            previewUrl,
            fallbackUrl
        });

    } catch (error) {
        console.error(`[PREVIEW ERROR] Failed to generate preview URL:`, error.message);
        res.status(500).json({
            error: "Failed to generate preview URL",
            details: error.message
        });
    }
});

export default router;
