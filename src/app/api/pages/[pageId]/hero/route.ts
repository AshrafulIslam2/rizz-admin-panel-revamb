import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const HERO_FILE = path.join(DATA_DIR, 'heroes.json');

type HeroPayload = {
  type: 'IMAGE' | 'VIDEO';
  backgroundImageUrl: string;
  slogan: string;
  title: string;
  subtitle: string;
  keyPoints: string[];
  isActive: boolean;
  order: number;
};

async function readHeroes(): Promise<Record<string, HeroPayload>> {
  try {
    const raw = await fs.readFile(HERO_FILE, 'utf-8');
    return raw ? (JSON.parse(raw) as Record<string, HeroPayload>) : {};
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? (error as NodeJS.ErrnoException).code : null;
    if (code === 'ENOENT') {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(HERO_FILE, '{}', 'utf-8');
      return {};
    }

    throw error;
  }
}

async function writeHeroes(heroes: Record<string, HeroPayload>) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(HERO_FILE, JSON.stringify(heroes, null, 2), 'utf-8');
}

async function getPageId(params: Promise<{ pageId: string }> | { pageId: string }) {
  return 'then' in params ? (await params).pageId : params.pageId;
}

export async function GET(_request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const pageId = await getPageId(params);
  const heroes = await readHeroes();
  const hero = heroes[pageId];

  if (!hero) {
    return Response.json({ message: 'Hero not found.' }, { status: 404 });
  }

  return Response.json({ pageId, ...hero });
}

export async function POST(request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const pageId = await getPageId(params);
  const payload = (await request.json()) as HeroPayload;

  const heroes = await readHeroes();

  if (heroes[pageId]) {
    return Response.json({ message: 'Hero already exists for this page.' }, { status: 409 });
  }

  heroes[pageId] = payload;
  await writeHeroes(heroes);

  return Response.json({ pageId, ...payload }, { status: 201 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const pageId = await getPageId(params);
  const payload = (await request.json()) as HeroPayload;
  const heroes = await readHeroes();

  heroes[pageId] = payload;
  await writeHeroes(heroes);

  return Response.json({ pageId, ...payload });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const pageId = await getPageId(params);
  const patch = (await request.json()) as Partial<HeroPayload>;
  const heroes = await readHeroes();
  const existing = heroes[pageId] ?? {
    type: 'IMAGE',
    backgroundImageUrl: '',
    slogan: '',
    title: '',
    subtitle: '',
    keyPoints: [],
    isActive: false,
    order: 0,
  };

  heroes[pageId] = {
    ...existing,
    ...patch,
  };
  await writeHeroes(heroes);

  return Response.json({ pageId, ...heroes[pageId] });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const pageId = await getPageId(params);
  const heroes = await readHeroes();

  if (!(pageId in heroes)) {
    return Response.json({ message: 'Hero not found.' }, { status: 404 });
  }

  delete heroes[pageId];
  await writeHeroes(heroes);

  return Response.json({ deleted: true, pageId });
}