// ============================================================
// مسار API خادمي: يستدعي Claude لتحليل بيانات المستخدم.
// المفتاح ANTHROPIC_API_KEY يبقى على الخادم ولا يصل للمتصفح أبداً.
// ============================================================
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "لم يُضبط مفتاح ANTHROPIC_API_KEY على الخادم." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const { prompt, maxTokens = 1000 } = body;
  if (!prompt) {
    return NextResponse.json({ error: "لا يوجد محتوى للتحليل." }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "تعذّر الاتصال بخدمة التحليل.", detail: text },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text = (data.content || []).map((b) => b.text || "").join("");
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json(
      { error: "حدث خطأ أثناء التحليل.", detail: String(e) },
      { status: 500 }
    );
  }
}
