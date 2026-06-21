import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, productName, category } = body as {
      imageUrl?: string;
      productName?: string;
      category?: string;
    };

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    // Fetch image and convert to base64
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Failed to fetch product image");
    const imgBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(imgBuffer).toString("base64");
    const mimeType = (imgRes.headers.get("content-type") || "image/jpeg") as
      | "image/jpeg"
      | "image/png"
      | "image/gif"
      | "image/webp";

    const hints = [
      productName ? `Product Name: ${productName}` : "",
      category ? `Category: ${category}` : "",
    ]
      .filter(Boolean)
      .join(". ");

    const prompt = `You are an expert eCommerce SEO and content specialist for a premium leather goods brand called RIZZ.
Analyze this product image carefully.
${hints ? `Context: ${hints}.` : ""}

Return ONLY valid JSON (no extra text):

\`\`\`json
{
  "name": "Compelling product title (50-60 chars, main keyword included)",
  "short_description": "2-3 sentence product summary for listing pages",
  "description": "Engaging 150-200 word product description. Highlight key features, benefits, materials, use-cases. Naturally include keywords.",
  "slug": "url-friendly-product-slug-lowercase-hyphens",
  "seo": {
    "meta_title": "SEO meta title max 60 chars",
    "meta_description": "Compelling meta description with CTA, max 155 chars",
    "focus_keyword": "primary keyword",
    "secondary_keywords": ["kw1", "kw2", "kw3"]
  },
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "alt_text": "Descriptive image alt text for accessibility and SEO",
  "faq": [
    { "question": "Frequently asked question 1?", "answer": "Detailed helpful answer 1." },
    { "question": "Frequently asked question 2?", "answer": "Detailed helpful answer 2." },
    { "question": "Frequently asked question 3?", "answer": "Detailed helpful answer 3." },
    { "question": "Frequently asked question 4?", "answer": "Detailed helpful answer 4." },
    { "question": "Frequently asked question 5?", "answer": "Detailed helpful answer 5." }
  ]
}
\`\`\``;

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: base64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const match = raw.match(/```json\n?([\s\S]*?)\n?```/) || raw.match(/(\{[\s\S]*\})/);
    if (!match) throw new Error("Could not parse AI response");

    const data = JSON.parse(match[1]);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[generate-product-content]", err);
    return NextResponse.json({ error: err.message || "Generation failed" }, { status: 500 });
  }
}
