import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
    try {
        console.log("Listing models...");
        // Just fetch response
        const fetch = await import('node-fetch');
        const res = await fetch.default(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await res.json();
        console.log(data);
    } catch (err) {
        console.error(err);
    }
}

run();
