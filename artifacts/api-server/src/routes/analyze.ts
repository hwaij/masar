import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

let client: Anthropic | null = null;
function getClient() {
  if (!client) {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

router.post("/analyze", async (req, res) => {
  try {
    const { prompt, maxTokens = 1000 } = req.body as { prompt: string; maxTokens?: number };
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "prompt is required" });
      return;
    }
    const anthropic = getClient();
    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: Math.min(maxTokens, 4096),
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    res.json({ text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An error occurred";
    res.status(500).json({ error: message });
  }
});

export default router;
