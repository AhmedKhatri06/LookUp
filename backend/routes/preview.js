import express from "express";
import { captureScreenshot } from "../services/previewService.js";

const router = express.Router();

/**
 * GET /api/preview
 * Generates a local Puppeteer screenshot for the given target URL.
 */
router.get("/", async (req, res) => {
    try {
        const targetUrl = req.query.url;

        if (!targetUrl) {
            return res.status(400).json({ error: "URL parameter is required" });
        }

        console.log(`[PreviewAPI] Generating local preview for: ${targetUrl.substring(0, 50)}...`);

        // Capture screenshot via local Puppeteer service
        // This is free, unlimited, and runs on the local backend (Windows-compatiable)
        const previewDataUri = await captureScreenshot(targetUrl, {
            width: 1280,
            height: 1024,
            isMobile: false
        });

        // For local Puppeteer, we use the same Data URI for both main and fallback 
        // as it is already a high-fidelity rendering.
        res.json({
            previewUrl: previewDataUri,
            fallbackUrl: previewDataUri
        });

    } catch (error) {
        console.error(`[PREVIEW ERROR] Failed to generate local preview:`, error.message);
        res.status(500).json({
            error: "Failed to generate local preview",
            details: error.message
        });
    }
});

export default router;
