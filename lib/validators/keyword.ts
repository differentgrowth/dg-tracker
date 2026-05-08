import { z } from "zod";

export const KEYWORD_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type KeywordPriority = (typeof KEYWORD_PRIORITIES)[number];

export const KEYWORD_STATUSES = ["active", "archived"] as const;
export type KeywordStatus = (typeof KEYWORD_STATUSES)[number];

const trimmed = z.string().trim();

const optionalText = trimmed
  .transform((value) => (value.length === 0 ? null : value))
  .nullable();

const optionalPriority = z
  .union([z.literal(""), z.enum(KEYWORD_PRIORITIES)])
  .transform((value) => (value === "" ? null : (value as KeywordPriority)))
  .nullable();

const optionalPosition = z
  .union([z.literal(""), z.coerce.number().int().min(1).max(100)])
  .transform((value) => (value === "" ? null : value))
  .nullable();

const tagsField = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => normalizeTags(toTagArray(value)));

const HTTP_PROTOCOL_REGEX = /^https?:\/\//i;

const optionalTargetUrl = trimmed
  .transform((value) => {
    if (value.length === 0) {
      return null;
    }
    return HTTP_PROTOCOL_REGEX.test(value) ? value : `https://${value}`;
  })
  .nullable()
  .refine(
    (value) => {
      if (value === null) {
        return true;
      }
      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "Enter a valid URL (e.g. https://acme.com/pricing)" }
  );

export const keywordBulkCreateSchema = z.object({
  domainId: trimmed.min(1, "Pick a domain"),
  terms: trimmed
    .min(1, "Paste at least one keyword")
    .transform((value) => normalizeTerms(value))
    .refine((terms) => terms.length > 0, {
      message: "Paste at least one keyword",
    })
    .refine((terms) => terms.length <= 500, {
      message: "Add at most 500 keywords at a time",
    }),
  priority: optionalPriority,
  tags: tagsField.default([]),
  category: optionalText,
  targetPosition: optionalPosition,
  targetUrl: optionalTargetUrl,
});

export const keywordUpdateSchema = z.object({
  priority: optionalPriority,
  tags: tagsField.default([]),
  category: optionalText,
  targetPosition: optionalPosition,
  targetUrl: optionalTargetUrl,
  notes: optionalText,
});

export type KeywordBulkCreateInput = z.infer<typeof keywordBulkCreateSchema>;
export type KeywordUpdateInput = z.infer<typeof keywordUpdateSchema>;

const TERM_SEPARATOR_REGEX = /[\r\n,]+/;
const WHITESPACE_REGEX = /\s+/g;

/**
 * Splits pasted text on newlines/commas, trims each line, collapses whitespace,
 * lowercases, and deduplicates while preserving the first occurrence's order.
 */
export function normalizeTerms(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const piece of raw.split(TERM_SEPARATOR_REGEX)) {
    const cleaned = piece.replace(WHITESPACE_REGEX, " ").trim().toLowerCase();
    if (!cleaned) {
      continue;
    }
    if (seen.has(cleaned)) {
      continue;
    }
    seen.add(cleaned);
    result.push(cleaned);
  }

  return result;
}

export function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );
}

function toTagArray(value: string | string[]): string[] {
  if (Array.isArray(value)) {
    return value;
  }
  return value.split(",");
}
