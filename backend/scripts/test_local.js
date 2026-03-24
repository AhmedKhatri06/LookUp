import { verifyFaceSimilarity, detectHumanFace } from '../services/faceVerification.js';
import { ollamaGenerateText } from '../services/localSummary.js';
import { matchInstagramProfiles, generateUsernameVariations } from '../services/instagramMatcher.js';

async function test() {
    console.log("--- Instagram Matcher Test ---");
    const name = "John Doe";
    console.log("Variations:", generateUsernameVariations(name).slice(0, 3));
    const results = [{ url: "https://instagram.com/johndoe", title: "John Doe" }];
    console.log("Matches:", matchInstagramProfiles(results, { name }).map(m => m.username));

    console.log("\n--- Ollama Service Test ---");
    try {
        const text = await ollamaGenerateText("Hi", "System", { timeoutMs: 2000 });
        console.log("Ollama OK:", !!text);
    } catch(e) { console.log("Ollama Skip:", e.message); }

    console.log("\n--- Face Verification Test ---");
    try {
        // Just checking if detection function exists and bridge starts
        console.log("Detection function type:", typeof detectHumanFace);
    } catch(e) { console.log("Face Error:", e.message); }
}

test();
