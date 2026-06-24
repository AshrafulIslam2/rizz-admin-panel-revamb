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

    // Fetch image → base64
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Failed to fetch product image");
    const imgBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(imgBuffer).toString("base64");
    const mimeType = (imgRes.headers.get("content-type") || "image/jpeg") as
      | "image/jpeg" | "image/png" | "image/gif" | "image/webp";

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
      model: "claude-opus-4-8",
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
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    if (response.stop_reason === "max_tokens") {
      console.error("[generate-product-content] Response truncated (hit max_tokens). Raw output:", raw);
      throw new Error("AI response was cut off before finishing — please try again.");
    }

    const match = raw.match(/```json\n?([\s\S]*?)\n?```/) || raw.match(/(\{[\s\S]*\})/);
    if (!match) throw new Error("Could not parse AI response");

    let data: any;
    try {
      data = JSON.parse(match[1]);
    } catch (parseErr) {
      console.error("[generate-product-content] JSON.parse failed. Raw AI output:\n", raw);
      throw new Error("AI returned malformed content — please try again.");
    }

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

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[generate-product-content]", err);
    return NextResponse.json({ error: err.message || "Generation failed" }, { status: 500 });
  }
}
