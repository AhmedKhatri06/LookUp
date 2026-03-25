import { captureScreenshot } from './services/previewService.js';
import fs from 'fs';
import path from 'path';

async function test() {
    try {
        console.log("Starting screenshot test for Wikipedia...");
        const dataUri = await captureScreenshot("https://en.wikipedia.org/wiki/Main_Page");
        const base64Data = dataUri.replace(/^data:image\/png;base64,/, "");
        const filePath = path.join(process.cwd(), 'test_screenshot.png');
        fs.writeFileSync(filePath, base64Data, 'base64');
        console.log(`Screenshot saved to ${filePath}`);
    } catch (err) {
        console.error("Test failed:", err);
    }
}

test();
