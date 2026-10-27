import express from 'express';
import { GoogleGenAI, Modality } from "@google/genai";
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("Set GEMINI_API_KEY before starting the backend.");
const client = new GoogleGenAI({ apiKey });
const app = express();
import cors from 'cors'; //
app.use(cors());


app.post("/temp/token", async (req, res) => {
    try {
        const token = await client.authTokens.create({
            config: {
                uses: 1, // The default
                expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                httpOptions: {
                    apiVersion: 'v1beta'
                }
            }
        });

        res.status(201).json({
            token:token.name
        })
    } catch (e) {
        console.error("Failed to create a live session token:", e);
        res.status(502).json({
            error:"Could not create an interview session. Check the backend API key and try again."
        })
    }

})


app.listen(3000)
