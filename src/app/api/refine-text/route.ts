import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FIELD_LABELS: Record<string, string> = {
  specs: "Specs & Dimensions",
  craftsmanship: "Craftsmanship & Materials",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fieldType, draft, productName, category } = body as {
      fieldType?: "specs" | "craftsmanship";
      draft?: string;
      productName?: string;
      category?: string;
    };

    if (!fieldType || !FIELD_LABELS[fieldType]) {
      return NextResponse.json({ error: "fieldType must be 'specs' or 'craftsmanship'" }, { status: 400 });
    }
    if (!draft || !draft.trim()) {
      return NextResponse.json({ error: "draft text is required" }, { status: 400 });
    }

    const fieldLabel = FIELD_LABELS[fieldType];
    const hints = [
      productName ? `Product: ${productName}` : "",
      category ? `Category: ${category}` : "",
    ].filter(Boolean).join(". ");

    const prompt = `You are a copywriter for RIZZ, a premium handcrafted leather goods brand from Chittagong, Bangladesh.

A store admin wrote rough, unorganized notes for the "${fieldLabel}" section of a product page. Treat their notes as raw input — refine, reconcile, and organize them into clean, well-structured, customer-facing copy.

Rules:
- Do NOT invent facts, measurements, or materials that aren't implied by the notes.
- Keep it factual and specific to what was written; just clean up grammar, structure, and flow.
- Plain text only, no markdown, no headings — a few short sentences or a tight paragraph.
- ${fieldType === "specs" ? "Focus on dimensions, sizing, weight, and physical specifications." : "Focus on materials used, craftsmanship process, and quality details."}
${hints ? `Context: ${hints}.` : ""}

Admin's notes:
"""
${draft}
"""

Return ONLY the refined text, nothing else — no quotes, no preamble.`;

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const refined = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    if (!refined) throw new Error("AI returned an empty response.");

    return NextResponse.json({ success: true, refined });
  } catch (err: any) {
    console.error("[refine-text]", err);
    return NextResponse.json({ error: err.message || "Refine failed" }, { status: 500 });
  }
}
