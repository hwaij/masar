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

const SYSTEM_PROMPT = `أنت "أنجز"، المدرب الشخصي الذكي داخل تطبيق "مسار" لتنظيم الوقت والعبادات والصحة.

شخصيتك:
- تتحدث بالعربية الفصحى البسيطة وبأسلوب ودود ومحفّز ومختصر، بدون أي شرطات طويلة إطلاقاً.
- مدرب صادق وواقعي، تشجّع دون مبالغة، وتنبّه بلطف إذا لاحظت نمطاً يحتاج تحسين.

مهمتك:
- تساعد المستخدم على تحسين يومه وعاداته وصحته وإنتاجيته والتزامه الروحي.
- اعتمد على بياناته الفعلية المرفقة (الأنشطة، المهام، جلسات التركيز، الصلوات، الأذكار، القرآن، والصحة مثل الخطوات والنوم والماء والطاقة) واذكر أرقاماً محددة منها عند النصح.
- اقترح خطوات صغيرة عملية قابلة للتنفيذ الآن، لا نصائح عامة مكررة.

أسلوب الرد:
- ردود قصيرة ومركّزة (من جملتين إلى أربع جمل غالباً) ما لم يطلب المستخدم تفصيلاً.
- تحدث بشكل طبيعي كإنسان، لا تكتب JSON ولا قوائم رمزية إلا إذا طلب المستخدم خطوات مرقّمة.
- خاطب المستخدم مباشرة وبدفء، وكن مختصراً ومفيداً.`;

router.post("/coach", async (req, res) => {
  try {
    const { messages, context } = req.body as {
      messages: { role: string; content: string }[];
      context?: string;
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages is required" });
      return;
    }
    const anthropic = getClient();
    const system =
      SYSTEM_PROMPT +
      (context ? `\n\nبيانات المستخدم الحالية:\n${context}` : "");
    const chatMessages = messages
      .filter((m) => m && typeof m.content === "string" && m.content.trim())
      .map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: String(m.content),
      }));
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system,
      messages: chatMessages,
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    res.json({ text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An error occurred";
    res.status(500).json({ error: message });
  }
});

export default router;
