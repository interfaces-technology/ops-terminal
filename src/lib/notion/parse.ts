type NotionProperty = Record<string, unknown>;

export function getTitle(props: Record<string, NotionProperty>, ...keys: string[]): string | null {
  for (const key of keys) {
    const prop = props[key];
    if (!prop || prop.type !== "title") continue;
    const title = prop.title as Array<{ plain_text: string }> | undefined;
    if (title?.[0]?.plain_text) return title[0].plain_text;
  }
  return null;
}

export function getRichText(props: Record<string, NotionProperty>, ...keys: string[]): string | null {
  for (const key of keys) {
    const prop = props[key];
    if (!prop || prop.type !== "rich_text") continue;
    const text = prop.rich_text as Array<{ plain_text: string }> | undefined;
    const joined = text?.map((t) => t.plain_text).join("") ?? "";
    if (joined) return joined;
  }
  return null;
}

export function getSelect(props: Record<string, NotionProperty>, ...keys: string[]): string | null {
  for (const key of keys) {
    const prop = props[key];
    if (!prop || prop.type !== "select") continue;
    const select = prop.select as { name: string } | null;
    if (select?.name) return select.name;
  }
  return null;
}

export function getStatus(props: Record<string, NotionProperty>, ...keys: string[]): string | null {
  for (const key of keys) {
    const prop = props[key];
    if (!prop || prop.type !== "status") continue;
    const status = prop.status as { name: string } | null;
    if (status?.name) return status.name;
  }
  return getSelect(props, ...keys);
}

export function getNumber(props: Record<string, NotionProperty>, ...keys: string[]): number | null {
  for (const key of keys) {
    const prop = props[key];
    if (!prop || prop.type !== "number") continue;
    const num = prop.number as number | null;
    if (num != null) return num;
  }
  return null;
}

export function getUrl(props: Record<string, NotionProperty>, ...keys: string[]): string | null {
  for (const key of keys) {
    const prop = props[key];
    if (!prop || prop.type !== "url") continue;
    const url = prop.url as string | null;
    if (url) return url;
  }
  return null;
}

export function getDate(props: Record<string, NotionProperty>, ...keys: string[]): string | null {
  for (const key of keys) {
    const prop = props[key];
    if (!prop || prop.type !== "date") continue;
    const date = prop.date as { start: string | null; end?: string | null } | null;
    if (date?.start) return date.start;
  }
  return null;
}

export function getFormulaText(props: Record<string, NotionProperty>, ...keys: string[]): string | null {
  for (const key of keys) {
    const prop = props[key];
    if (!prop || prop.type !== "formula") continue;
    const formula = prop.formula as { type: string; string?: string };
    if (formula.type === "string" && formula.string) return formula.string;
  }
  return null;
}
