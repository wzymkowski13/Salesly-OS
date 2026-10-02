export type FinanceClassificationRule = {
  id: string;
  name: string;
  active: boolean;
  priority: number;
  match_field: "description";
  match_operator: "contains" | "starts_with" | "exact";
  match_value: string;
  applies_to_type: "income" | "expense" | null;
  set_scope: "business" | "private" | null;
  set_category_id: string | null;
  set_source_id: string | null;
};

export type ClassifiableFinanceRow = {
  transaction_type: "income" | "expense";
  description: string;
  scope: "business" | "private";
  category_id: string | null;
  source_id: string | null;
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase("pl-PL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matches(rule: FinanceClassificationRule, row: ClassifiableFinanceRow) {
  if (!rule.active) return false;
  if (rule.applies_to_type && rule.applies_to_type !== row.transaction_type) return false;

  const haystack = normalize(row.description || "");
  const needle = normalize(rule.match_value || "");
  if (!needle) return false;

  if (rule.match_operator === "exact") return haystack === needle;
  if (rule.match_operator === "starts_with") return haystack.startsWith(needle);
  return haystack.includes(needle);
}

export function applyFinanceClassificationRules(
  row: ClassifiableFinanceRow,
  rules: FinanceClassificationRule[]
) {
  const rule = [...rules]
    .sort((a,b) => a.priority - b.priority || a.name.localeCompare(b.name))
    .find(candidate => matches(candidate, row));

  if (!rule) return { row, matchedRule: null };

  return {
    row: {
      ...row,
      scope: rule.set_scope || row.scope,
      category_id: rule.set_category_id || row.category_id,
      source_id: row.transaction_type === "income"
        ? (rule.set_source_id || row.source_id)
        : null,
    },
    matchedRule: rule,
  };
}

export function suggestRuleMatchValue(description: string) {
  const parts = String(description || "")
    .split("·")
    .map(part => part.trim())
    .filter(Boolean);

  const candidate = parts[0] || String(description || "").trim();
  return candidate
    .replace(/\b(ref|reference|referencja|nr|numer|id)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}
