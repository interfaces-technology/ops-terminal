import { NOTION_FOCUS_PAGE_ID } from "@/lib/config";
import type { NotionFocus } from "@/types/ops";

import { NOTION_API, notionHeaders } from "@/lib/notion/auth";

interface RichText {
  plain_text: string;
}

interface NotionBlock {
  id: string;
  type: string;
  paragraph?: { rich_text: RichText[] };
  heading_1?: { rich_text: RichText[] };
  heading_2?: { rich_text: RichText[] };
  heading_3?: { rich_text: RichText[] };
  bulleted_list_item?: { rich_text: RichText[] };
  numbered_list_item?: { rich_text: RichText[] };
  quote?: { rich_text: RichText[] };
  callout?: { rich_text: RichText[] };
  toggle?: { rich_text: RichText[] };
}

interface BlockChildrenResponse {
  results: NotionBlock[];
  has_more: boolean;
  next_cursor: string | null;
}

function richTextPlain(richText: RichText[] | undefined): string {
  return richText?.map((part) => part.plain_text).join("") ?? "";
}

function blockPlainText(block: NotionBlock): string {
  const payload =
    block.paragraph ??
    block.heading_1 ??
    block.heading_2 ??
    block.heading_3 ??
    block.bulleted_list_item ??
    block.numbered_list_item ??
    block.quote ??
    block.callout ??
    block.toggle;
  return richTextPlain(payload?.rich_text);
}

function normalizeHeading(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

async function notionFetch(path: string): Promise<Response> {
  return fetch(`${NOTION_API}${path}`, {
    headers: notionHeaders(),
    cache: "no-store",
  });
}

async function fetchBlockChildren(blockId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const query = cursor ? `?start_cursor=${cursor}` : "";
    const res = await notionFetch(`/blocks/${blockId}/children${query}`);

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 404) {
        throw new Error(
          "Notion Focus page not found — check NOTION_FOCUS_PAGE_ID in config.ts or confirm you can open the page in Notion",
        );
      }
      throw new Error(`Notion Blocks API error (focus): ${res.status} ${body}`);
    }

    const json = (await res.json()) as BlockChildrenResponse;
    blocks.push(...json.results);
    cursor = json.has_more ? (json.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return blocks;
}

function sectionTextAfterHeading(blocks: NotionBlock[], headings: string[]): string | null {
  const targets = new Set(headings.map(normalizeHeading));

  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (!block.type.startsWith("heading_")) continue;

    const heading = normalizeHeading(blockPlainText(block));
    if (!targets.has(heading) && !Array.from(targets).some((target) => heading.includes(target))) {
      continue;
    }

    for (let next = index + 1; next < blocks.length; next++) {
      const candidate = blocks[next];
      if (candidate.type.startsWith("heading_")) break;

      const text = blockPlainText(candidate);
      if (text.trim()) return text.trim();
    }
  }

  return null;
}

/** Reads narrative sections from the Focus page. Slots are derived from active Projects. */
export async function fetchFocusPage(): Promise<NotionFocus> {
  const blocks = await fetchBlockChildren(NOTION_FOCUS_PAGE_ID);

  return {
    slots: [],
    lastSession: sectionTextAfterHeading(blocks, ["last session", "where i left off"]),
    notes: sectionTextAfterHeading(blocks, ["notes"]),
    thisWeek: sectionTextAfterHeading(blocks, ["this week"]),
  };
}
