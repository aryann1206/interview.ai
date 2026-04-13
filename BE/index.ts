import express from 'express';
import { GoogleGenAI, Modality } from "@google/genai";
const client = new GoogleGenAI({apiKey: "AIzaSyDY2hQy8UiiVu-CWZYrf6DolH3lh1H7wMs"});
const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
const app = express();
import cors from 'cors'; //
app.use(cors());


app.post("/temp/token", async (req, res) => {
    try {
        const token = await client.authTokens.create({
            config: {
                uses: 1, // The default
                expireTime: expireTime,
                httpOptions: {
                    apiVersion: 'v1alpha'
                }
            }
        });

        res.status(201).json({
            token:token.name
        })
    } catch (e) {
        res.status(400).json({
            message:"try again later"
        })
    }

})


app.listen(3000)
