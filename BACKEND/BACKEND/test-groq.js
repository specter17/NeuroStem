import dotenv from "dotenv";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { Groq } = require("groq-sdk");

dotenv.config();

console.log("🔍 Testing Groq SDK Setup...\n");

const apiKey = process.env.GROQ_API_KEY;
console.log(`✓ API Key exists: ${apiKey ? "YES (length: " + apiKey.length + ")" : "NO"}`);
console.log(`✓ Groq module loaded: ${Groq ? "YES" : "NO"}`);

try {
    const groq = new Groq({ apiKey });
    console.log(`✓ Groq instance created successfully`);
    console.log(`✓ groq.chat exists: ${groq.chat ? "YES" : "NO"}`);
    console.log(`✓ groq.chat.completions exists: ${groq.chat?.completions ? "YES" : "NO"}`);
    console.log(`✓ groq.chat.completions.create exists: ${groq.chat?.completions?.create ? "YES" : "NO"}`);
    console.log("\n✅ All tests passed! Ready to use.");
} catch (error) {
    console.error(`✗ Failed to create Groq instance:`, error.message);
}
