import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'faqs.json');

type FaqRecord = {
  id?: string;
  pageId?: string | number;
  page_id?: string | number;
  question: string;
  answer: string;
  short_answer?: string;
  answer_type?: string;
  intent_type?: string;
  seo_title?: string;
  seo_description?: string;
  slug?: string;
  schema_enabled?: boolean;
  ai_summary?: string;
  entity_tags?: string[];
  source_url?: string;
  fact_check_status?: string;
  last_verified_at?: string;
  context?: string;
};

async function readFaqs(): Promise<FaqRecord[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildJsonLd(faqs: FaqRecord[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export async function GET(_: Request, { params }: { params: { pageId: string } }) {
  const pageId = String(params.pageId || '').trim();

  if (!pageId) {
    return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
  }

  const allFaqs = await readFaqs();
  const pageFaqs = allFaqs.filter((faq) => String(faq.pageId ?? faq.page_id) === pageId);

  return NextResponse.json({
    faqs: pageFaqs,
    jsonLd: buildJsonLd(pageFaqs),
  });
}
