import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { createAiStream } from "@/lib/ai-stream";

export const runtime = "nodejs";
export const maxDuration = 180;

type GenerationInput = { imageUrl: string; productName?: string; category?: string };

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !await verifySessionToken(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 }); }
  if (!body || typeof body.imageUrl !== "string" || !body.imageUrl.trim()) return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "AI is not configured. Set ANTHROPIC_API_KEY on the admin server." }, { status: 503 });
  const input: GenerationInput = {
    imageUrl: body.imageUrl.trim(),
    productName: typeof body.productName === "string" ? body.productName.slice(0, 500) : undefined,
    category: typeof body.category === "string" ? body.category.slice(0, 300) : undefined,
  };
  const generate = (signal: AbortSignal) => generateContent(input, signal);
  if (req.headers.get("accept")?.includes("application/x-ndjson")) return createAiStream(req, generate);
  const result = await generate(req.signal);
  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}

async function generateContent({ imageUrl, productName, category }: GenerationInput, signal: AbortSignal) {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 150000, maxRetries: 0 });

    // Fetch image → base64
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
    if (!imgRes.ok) throw new Error("Could not load the product image. Check its public image URL.");
    const imgBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(imgBuffer).toString("base64");
    const mimeType = (imgRes.headers.get("content-type") || "image/jpeg").split(";")[0].trim().toLowerCase() as
      | "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType)) throw new Error("The product image must be JPEG, PNG, GIF or WebP.");
    if (imgBuffer.byteLength > 5 * 1024 * 1024) throw new Error("The product image is too large for AI. Use an image smaller than 5 MB.");

    const hints = [
      productName ? `Product Name: ${productName}` : "",
      category ? `Category: ${category}` : "",
    ].filter(Boolean).join(". ");

    const prompt = `You are an expert eCommerce SEO specialist for RIZZ — a premium handcrafted leather goods brand from Chittagong, Bangladesh.

Analyze this product image carefully.
${hints ? `Context: ${hints}.` : ""}

Generate bilingual content (English + Bengali/Bangla) optimized for:
- SEO (Google search ranking)
- AEO (Answer Engine Optimization — featured snippets, People Also Ask)
- GEO (Generative Engine Optimization — AI answer engines like ChatGPT, Perplexity, Claude)

Return ONLY valid JSON (no extra text, no markdown outside the json block):

\`\`\`json
{
  "en": {
    "name": "Product title 50-60 chars with main keyword",
    "short_description": "2-3 sentence summary for listing pages",
    "description": "150-200 word engaging description. Highlight features, benefits, materials, use-cases. Include keywords naturally.",
    "slug": "url-friendly-slug-lowercase-hyphens",
    "meta_title": "SEO meta title max 60 chars | RIZZ Leather",
    "meta_description": "Compelling meta description with CTA max 155 chars",
    "og_title": "Open Graph title for social sharing",
    "og_description": "OG description max 200 chars",
    "focus_keyword": "primary SEO keyword",
    "secondary_keywords": ["keyword2", "keyword3", "keyword4"],
    "long_tail_keywords": ["natural product-specific shopping phrase"],
    "geo_keywords": ["product shopping phrase in Bangladesh"],
    "alt_text": "Descriptive image alt text for accessibility and SEO",
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
    "faq": [
      { "question": "Customer question 1?", "answer": "Detailed helpful answer 1." },
      { "question": "Customer question 2?", "answer": "Detailed helpful answer 2." },
      { "question": "Customer question 3?", "answer": "Detailed helpful answer 3." },
      { "question": "Customer question 4?", "answer": "Detailed helpful answer 4." },
      { "question": "Customer question 5?", "answer": "Detailed helpful answer 5." }
    ]
  },
  "bn": {
    "name": "বাংলায় product title ৫০-৬০ অক্ষর",
    "short_description": "বাংলায় ২-৩ বাক্যের সারসংক্ষেপ",
    "description": "বাংলায় ১৫০-২০০ শব্দের বিবরণ। features, উপকরণ, সুবিধা উল্লেখ করো।",
    "meta_title": "বাংলায় SEO meta title সর্বোচ্চ ৬০ অক্ষর | RIZZ Leather",
    "meta_description": "বাংলায় meta description সর্বোচ্চ ১৫৫ অক্ষর",
    "og_title": "বাংলায় OG title",
    "og_description": "বাংলায় OG description",
    "focus_keyword": "বাংলায় প্রাথমিক keyword",
    "alt_text": "বাংলায় image alt text",
    "tags": ["বাংলা ট্যাগ১", "বাংলা ট্যাগ২", "বাংলা ট্যাগ৩"],
    "faq": [
      { "question": "বাংলায় প্রশ্ন ১?", "answer": "বাংলায় বিস্তারিত উত্তর ১।" },
      { "question": "বাংলায় প্রশ্ন ২?", "answer": "বাংলায় বিস্তারিত উত্তর ২।" },
      { "question": "বাংলায় প্রশ্ন ৩?", "answer": "বাংলায় বিস্তারিত উত্তর ৩।" },
      { "question": "বাংলায় প্রশ্ন ৪?", "answer": "বাংলায় বিস্তারিত উত্তর ৪।" },
      { "question": "বাংলায় প্রশ্ন ৫?", "answer": "বাংলায় বিস্তারিত উত্তর ৫।" }
    ]
  },
  "schema": {
    "product": {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": "",
      "description": "",
      "image": "",
      "brand": { "@type": "Brand", "name": "RIZZ Leather" },
      "offers": {
        "@type": "Offer",
        "availability": "https://schema.org/InStock",
        "priceCurrency": "BDT",
        "seller": { "@type": "Organization", "name": "RIZZ Leather" }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "0"
      }
    },
    "faq_schema": {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": []
    }
  }
}
\`\`\``;

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_PRODUCT_MODEL || process.env.ANTHROPIC_SEO_MODEL || "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
            { type: "text", text: prompt },
          ],
        },
      ],
    }, { signal });

    const raw = response.content.filter(block => block.type === "text").map(block => block.text).join("");

    if (response.stop_reason === "max_tokens") {
      console.error("[generate-product-content] Response reached max_tokens.");
      throw new Error("AI response was cut off before finishing — please try again.");
    }

    const match = raw.match(/```json\n?([\s\S]*?)\n?```/) || raw.match(/(\{[\s\S]*\})/);
    if (!match) throw new Error("Could not parse AI response");

    let data: any;
    try {
      data = JSON.parse(match[1]);
    } catch (parseErr) {
      console.error("[generate-product-content] AI output was not valid JSON.");
      throw new Error("AI returned malformed content — please try again.");
    }

    if (!data || typeof data.en !== "object" || typeof data.bn !== "object") throw new Error("AI returned an incomplete bilingual draft. Please try again.");

    // Build FAQ schema from EN FAQs
    if (data.en?.faq && data.schema?.faq_schema) {
      data.schema.faq_schema.mainEntity = data.en.faq.map((f: { question: string; answer: string }) => ({
        "@type": "Question",
        "name": f.question,
        "acceptedAnswer": { "@type": "Answer", "text": f.answer },
      }));
    }
    if (data.schema?.product) {
      data.schema.product.name = data.en?.name || "";
      data.schema.product.description = data.en?.description || "";
      data.schema.product.image = imageUrl;
    }

    return { success: true, data };
  } catch (error) {
    console.error("[generate-product-content]", error instanceof Error ? error.name : "Generation error");
    const message = signal.aborted || (error instanceof Error && /timeout|abort/i.test(error.name))
      ? "AI took too long to respond. Please try again."
      : error instanceof Anthropic.APIError
        ? error.status === 401 ? "AI provider credentials are invalid. Check ANTHROPIC_API_KEY on the admin server."
          : error.status === 429 ? "AI request limit reached. Please try again later."
          : error.status === 404 ? "The configured AI model is unavailable. Check ANTHROPIC_PRODUCT_MODEL."
          : "AI provider could not complete the request. Please try again."
        : error instanceof Error ? error.message : "Generation failed.";
    return { success: false, error: message };
  }
}
