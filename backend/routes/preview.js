import express from "express";
import Urlbox from "urlbox";

const router = express.Router();

/**
 * GET /api/preview
 * Generates an interactive Urlbox preview URL for the given target URL.
 */
router.get("/", async (req, res) => {
    try {
        let targetUrl = req.query.url;

        if (!targetUrl) {
            return res.status(400).json({ error: "URL parameter is required" });
        }

        // --- Wikipedia Optimization ---
        const isWikipedia = targetUrl.includes('wikipedia.org');
        let wikipediaCss = '';

        if (isWikipedia) {
            // 1. URL Transformation: Use mobile version + printable mode for cleanest base
            if (!targetUrl.includes('.m.wikipedia.org')) {
                targetUrl = targetUrl.replace('wikipedia.org', 'm.wikipedia.org');
            }
            if (!targetUrl.includes('printable=yes')) {
                targetUrl += (targetUrl.includes('?') ? '&' : '?') + 'printable=yes';
            }

            // 2. CSS Injection: Hide all UI clutter
            wikipediaCss = `
                /* Hide headers, footers, and sidebars */
                header, footer, .vector-header-container, .vector-menu, .mw-footer, 
                #mw-navigation, #siteNavigation, .client-js .mw-body-content,
                #jump-to-nav, .search-box, .banner-container, .notice,
                .navbox, .catlinks, .printfooter, .mw-editsection {
                    display: none !important;
                }
                
                /* Ensure main content takes full width and is readable */
                body, .mw-body, #content {
                    margin: 0 !important;
                    padding: 15px !important;
                    width: 100% !important;
                    max-width: none !important;
                    background: white !important;
                }
                
                .mw-page-container {
                    padding: 0 !important;
                    margin: 0 !important;
                }

                /* Hide 'Jump to content' and 'Main menu' buttons if they still appear */
                .messagebox, .infobox, .ambox {
                    margin-top: 0 !important;
                }
            `;
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
            // Standard CSS Injection
            const style = document.createElement('style');
            style.innerHTML = \`${wikipediaCss}\`;
            document.head.appendChild(style);

            // 1. Detect standard clicks on Auth links/buttons (Aggressive Capture)
            document.addEventListener('click', function(e) {
                const path = e.composedPath ? e.composedPath() : (e.path || []);
                const isAuthLink = path.some(el => {
                    if (el && (el.tagName === 'A' || el.tagName === 'BUTTON' || el.role === 'button')) {
                        const text = (el.innerText || '').toLowerCase();
                        const href = (el.href || '').toLowerCase();
                        return /(login|sign\\\\s*in|sign\\\\s*up|continue\\\\s*with|oauth|auth|google|join|agree\\\\s*&\\\\s*join|agree\\\\s*and\\\\s*join)/i.test(text) || 
                               /(login|signin|signup|oauth|auth|join)/i.test(href);
                    }
                    return false;
                });

                if (isAuthLink) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.parent.postMessage({ type: 'URLBOX_AUTH_CLICKED' }, '*');
                }
            }, true);

            // 2. Detect Form Submissions (Login forms)
            document.addEventListener('submit', function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.parent.postMessage({ type: 'URLBOX_AUTH_CLICKED' }, '*');
            }, true);

            // 3. Detect clicks into embedded OAuth iframes
            window.addEventListener('blur', function() {
                setTimeout(function() {
                    const activeElem = document.activeElement;
                    if (activeElem && activeElem.tagName === 'IFRAME') {
                        const src = (activeElem.src || '').toLowerCase();
                        if (src.includes('google.com') || src.includes('oauth') || src.includes('auth')) {
                            window.parent.postMessage({ type: 'URLBOX_AUTH_CLICKED' }, '*');
                        }
                    }
                }, 50);
            });

            // 4. Fallback: Catch any cross-origin navigations
            window.addEventListener('beforeunload', function(e) {
                window.parent.postMessage({ type: 'URLBOX_AUTH_CLICKED' }, '*');
            });
        `;

        // Generate the URL for interactive HTML preview
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
