import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { title, topic, category } = await req.json() as {
      title?: string;
      topic?: string;
      category?: string;
    };

    if (!title && !topic) {
      return NextResponse.json({ error: "title or topic is required" }, { status: 400 });
    }

    const subject = title || topic;

    const prompt = `You are an expert content writer for RIZZ — a premium handcrafted leather goods brand from Chittagong, Bangladesh. Write a high-quality, SEO-optimized blog post.

Topic: "${subject}"
${category ? `Category: ${category}` : ""}

Return ONLY valid JSON in this exact structure (no markdown, no extra text):
{
  "title": "Compelling post title (50-70 chars)",
  "slug": "url-friendly-slug-lowercase-hyphens",
  "description": "Compelling meta description / excerpt (120-160 chars)",
  "category": "${category || "Buying Guide"}",
  "reading_time": 6,
  "body": [
    { "type": "p", "text": "Opening paragraph..." },
    { "type": "h2", "text": "Section heading..." },
    { "type": "p", "text": "Section paragraph..." },
    { "type": "ul", "items": ["Point 1", "Point 2", "Point 3"] },
    { "type": "h2", "text": "Another section..." },
    { "type": "p", "text": "More content..." },
    { "type": "callout", "text": "Key takeaway or expert tip..." },
    { "type": "table", "head": ["Feature", "Detail"], "rows": [["Row 1 col 1", "Row 1 col 2"]] },
    { "type": "h2", "text": "Conclusion..." },
    { "type": "p", "text": "Closing paragraph..." }
  ]
}

Rules:
- body must be an array of section objects. Each object has "type" and the appropriate fields:
  - p: { type: "p", text: "..." }
  - h2: { type: "h2", text: "..." }
  - h3: { type: "h3", text: "..." }
  - ul: { type: "ul", items: ["...", "..."] }
  - ol: { type: "ol", items: ["...", "..."] }
  - callout: { type: "callout", text: "..." }
  - table: { type: "table", head: ["col1", "col2"], rows: [["a","b"],["c","d"]] }
- Write at least 8-12 body sections for a thorough post
- Focus on Bangladesh leather market, Chittagong craftsmanship, genuine leather
- Use natural, helpful tone — not salesy
- Include practical, actionable advice
- Return only valid JSON — no markdown code fences`;

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 6000,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    if (response.stop_reason === "max_tokens") {
      throw new Error("AI response was cut off — please try again.");
    }

    const match = raw.match(/```json\n?([\s\S]*?)\n?```/) || raw.match(/(\{[\s\S]*\})/);
    if (!match) throw new Error("Could not parse AI response");

    let data: any;
    try {
      data = JSON.parse(match[1]);
    } catch {
      throw new Error("AI returned malformed JSON — please try again.");
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[generate-post]", err);
    return NextResponse.json({ error: err.message || "Generation failed" }, { status: 500 });
  }
}
