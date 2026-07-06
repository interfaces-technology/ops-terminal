import { NOTION_FOCUS_PAGE_ID } from "@/lib/config";
import type { NotionFocus, NotionFocusSlot } from "@/types/ops";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

interface RichText {
  plain_text: string;
  href?: string | null;
}

interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  paragraph?: { rich_text: RichText[] };
  heading_1?: { rich_text: RichText[] };
  heading_2?: { rich_text: RichText[] };
  heading_3?: { rich_text: RichText[] };
  bulleted_list_item?: { rich_text: RichText[] };
  numbered_list_item?: { rich_text: RichText[] };
  quote?: { rich_text: RichText[] };
  callout?: { rich_text: RichText[] };
  table?: { table_width: number; has_column_header: boolean };
  table_row?: { cells: RichText[][] };
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

function richTextUrl(richText: RichText[] | undefined): string | null {
  if (!richText) return null;
  for (const part of richText) {
    if (part.href) return part.href;
  }
  return null;
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
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error("NOTION_API_KEY is not set");
  }

  return fetch(`${NOTION_API}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": NOTION_VERSION,
    },
    next: { revalidate: 0 },
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
          'Notion Focus page not found or not shared with your integration — open Focus → ••• → Connections → add "ops-terminal"',
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

function parseSlotNumber(value: string): 1 | 2 | 3 | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:slot\s*)?([123])\b/i);
  if (!match) return null;
  const n = Number(match[1]);
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}

export function extractLinearIdentifier(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/\b([A-Z]{2,10}-\d+)\b/);
  return match?.[1] ?? null;
}

async function parseFocusTable(tableBlock: NotionBlock): Promise<NotionFocusSlot[]> {
  const rowBlocks = await fetchBlockChildren(tableBlock.id);
  const slots: NotionFocusSlot[] = [];

  for (const row of rowBlocks) {
    if (row.type !== "table_row" || !row.table_row) continue;

    const cells = row.table_row.cells;
    const plainCells = cells.map((cell) => richTextPlain(cell));
    const headerLike = plainCells.some((cell) => /^(slot|task|area|link|#)$/i.test(cell.trim()));
    if (headerLike && slots.length === 0) continue;

    const slotNum =
      parseSlotNumber(plainCells[0]) ??
      parseSlotNumber(plainCells.find((cell) => parseSlotNumber(cell) !== null) ?? "");

    if (slotNum !== 1 && slotNum !== 2 && slotNum !== 3) continue;

    const labelCellIndex = plainCells.findIndex(
      (cell, index) => index > 0 && parseSlotNumber(cell) === null && cell.trim().length > 2,
    );
    const label =
      labelCellIndex >= 0
        ? plainCells[labelCellIndex].trim()
        : plainCells.find((cell) => parseSlotNumber(cell) === null && cell.trim())?.trim() ?? "";

    if (!label) continue;

    let url: string | null = null;
    for (const cell of cells) {
      const href = richTextUrl(cell);
      if (href) {
        url = href;
        break;
      }
    }

    const area =
      plainCells.find((cell) =>
        /^(play|workbench|labs|lab|company|pipeline)$/i.test(cell.trim()),
      ) ?? null;

    slots.push({
      slot: slotNum,
      label,
      area,
      url,
      linearIdentifier: extractLinearIdentifier(label) ?? extractLinearIdentifier(url),
      linearState: null,
    });
  }

  return slots.sort((a, b) => a.slot - b.slot);
}

function parseListSlots(blocks: NotionBlock[]): NotionFocusSlot[] {
  const slots: NotionFocusSlot[] = [];

  for (const block of blocks) {
    const text = blockPlainText(block);
    const slotNum = parseSlotNumber(text);
    if (slotNum !== 1 && slotNum !== 2 && slotNum !== 3) continue;

    const label = text.replace(/^(?:slot\s*)?[123][.:)\-\s]+/i, "").trim();
    if (!label) continue;

    slots.push({
      slot: slotNum,
      label,
      area: null,
      url: null,
      linearIdentifier: extractLinearIdentifier(label),
      linearState: null,
    });
  }

  return slots;
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

export async function fetchFocusPage(): Promise<NotionFocus> {
  const blocks = await fetchBlockChildren(NOTION_FOCUS_PAGE_ID);

  let slots: NotionFocusSlot[] = [];
  const tables = blocks.filter((block) => block.type === "table");

  for (const table of tables) {
    const parsed = await parseFocusTable(table);
    if (parsed.length > 0) {
      slots = parsed;
      break;
    }
  }

  if (slots.length === 0) {
    slots = parseListSlots(blocks);
  }

  const lastSession = sectionTextAfterHeading(blocks, ["last session", "where i left off"]);
  const notes = sectionTextAfterHeading(blocks, ["notes"]);
  const thisWeek = sectionTextAfterHeading(blocks, ["this week"]);

  return {
    slots,
    lastSession,
    notes,
    thisWeek,
  };
}
