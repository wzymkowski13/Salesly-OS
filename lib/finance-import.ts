import { createHash } from "crypto";
import ExcelJS from "exceljs";

export type ParsedFinanceRow = {
  id: string;
  occurred_on: string;
  transaction_type: "income" | "expense";
  amount: number;
  description: string;
  scope: "business" | "private";
  category_id: string | null;
  source_id: string | null;
  include: boolean;
  duplicate: boolean;
  import_hash: string;
  raw_data: Record<string, string>;
};

type MatrixCell = string | number | boolean | Date | null | undefined;

const DATE_KEYS = ["data operacji","data transakcji","data księgowania","data","transaction date","booking date","date"];
const AMOUNT_KEYS = ["kwota operacji","kwota transakcji","kwota","amount","wartosc","wartość"];
const DEBIT_KEYS = ["obciazenie","obciążenie","kwota obciazenia","kwota obciążenia","debit","wyplata","wypłata"];
const CREDIT_KEYS = ["uznanie","kwota uznania","credit","wplata","wpłata"];
const DESCRIPTION_KEYS = ["tytul","tytuł","opis transakcji","opis","szczegoly","szczegóły","description","details","title"];
const COUNTERPARTY_KEYS = ["odbiorca","nadawca","kontrahent","beneficjent","recipient","sender","counterparty"];
const REFERENCE_KEYS = ["nr referencyjny","numer referencyjny","referencja","reference","id transakcji","transaction id"];

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pl-PL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function headerMatch(header: string, variants: string[]) {
  const normalized = normalize(header);
  return variants.some(variant => normalized === normalize(variant) || normalized.includes(normalize(variant)));
}

function stringifyCell(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseCsv(text: string) {
  const sample = text.slice(0, 10000);
  const delimiters = [";", ",", "\t"];
  let delimiter = ";";
  let best = -1;
  for (const candidate of delimiters) {
    const score = sample.split("\n").slice(0, 10).reduce((sum,line) => sum + Math.max(0, line.split(candidate).length - 1), 0);
    if (score > best) { best = score; delimiter = candidate; }
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell.trim());
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(value => value !== "")) rows.push(row);
  return rows;
}

async function parseXlsx(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [] as MatrixCell[][];

  const matrix: MatrixCell[][] = [];
  worksheet.eachRow({ includeEmpty: false }, row => {
    const values = row.values as MatrixCell[];
    matrix.push(values.slice(1).map(value => {
      if (value && typeof value === "object" && !(value instanceof Date)) {
        if ("text" in (value as any)) return String((value as any).text);
        if ("result" in (value as any)) return String((value as any).result ?? "");
        if ("richText" in (value as any)) return (value as any).richText.map((part:any) => part.text).join("");
      }
      return value;
    }));
  });
  return matrix;
}

function detectHeaderRow(matrix: MatrixCell[][]) {
  let bestIndex = -1;
  let bestScore = 0;

  for (let i = 0; i < Math.min(matrix.length, 25); i++) {
    const headers = matrix[i].map(stringifyCell);
    let score = 0;
    if (headers.some(header => headerMatch(header, DATE_KEYS))) score += 3;
    if (headers.some(header => headerMatch(header, AMOUNT_KEYS))) score += 3;
    if (headers.some(header => headerMatch(header, DEBIT_KEYS))) score += 2;
    if (headers.some(header => headerMatch(header, CREDIT_KEYS))) score += 2;
    if (headers.some(header => headerMatch(header, DESCRIPTION_KEYS))) score += 3;
    if (headers.some(header => headerMatch(header, COUNTERPARTY_KEYS))) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex < 0 || bestScore < 5) throw new Error("Nie udało się rozpoznać nagłówków wyciągu. Potrzebne są co najmniej data, kwota i opis.");
  return bestIndex;
}

function columnIndex(headers: string[], variants: string[]) {
  return headers.findIndex(header => headerMatch(header, variants));
}

function parseAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  let text = stringifyCell(value)
    .replace(/\u00a0/g, " ")
    .replace(/PLN|EUR|USD|GBP/gi, "")
    .replace(/\s/g, "");

  if (!text) return null;

  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma > dot) text = text.replace(/\./g, "").replace(",", ".");
  else if (dot > comma && comma >= 0) text = text.replace(/,/g, "");
  else text = text.replace(",", ".");

  text = text.replace(/[^0-9.\-+]/g, "");
  const valueNumber = Number(text);
  return Number.isFinite(valueNumber) ? valueNumber : null;
}

function excelSerialToDate(serial: number) {
  const utc = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && value > 20000 && value < 80000) return excelSerialToDate(value);

  const text = stringifyCell(value).trim();
  if (!text) return null;

  let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));

  match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (match) return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isoDate(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function fingerprint(row: Record<string,string>, occurrence: number) {
  const canonical = Object.entries(row)
    .map(([key,value]) => [normalize(key), normalize(value)] as const)
    .sort(([a],[b]) => a.localeCompare(b));
  const base = JSON.stringify(canonical);
  return createHash("sha256").update(`${base}|${occurrence}`).digest("hex");
}

export async function parseFinanceFile(file: File, defaultScope: "business"|"private") {
  const name = file.name || "wyciag";
  const extension = name.split(".").pop()?.toLowerCase();
  if (!["csv","xlsx"].includes(extension || "")) throw new Error("Obsługiwane są pliki CSV i XLSX.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Plik jest za duży. Maksymalny rozmiar to 8 MB.");

  const buffer = Buffer.from(await file.arrayBuffer());
  let matrix: MatrixCell[][];

  if (extension === "xlsx") {
    matrix = await parseXlsx(buffer);
  } else {
    let text = buffer.toString("utf8");
    if (text.includes("�")) {
      // A large share of Polish bank CSV exports still use Windows-1250.
      text = new TextDecoder("windows-1250").decode(buffer);
    }
    matrix = parseCsv(text);
  }

  if (!matrix.length) throw new Error("Plik nie zawiera danych.");

  const headerRow = detectHeaderRow(matrix);
  const headers = matrix[headerRow].map(stringifyCell);
  const dateIndex = columnIndex(headers, DATE_KEYS);
  const amountIndex = columnIndex(headers, AMOUNT_KEYS);
  const debitIndex = columnIndex(headers, DEBIT_KEYS);
  const creditIndex = columnIndex(headers, CREDIT_KEYS);
  const descriptionIndex = columnIndex(headers, DESCRIPTION_KEYS);
  const counterpartyIndex = columnIndex(headers, COUNTERPARTY_KEYS);
  const referenceIndex = columnIndex(headers, REFERENCE_KEYS);

  if (dateIndex < 0) throw new Error("Nie znaleziono kolumny z datą.");
  if (amountIndex < 0 && debitIndex < 0 && creditIndex < 0) throw new Error("Nie znaleziono kolumny z kwotą.");

  const parsed: Omit<ParsedFinanceRow,"duplicate">[] = [];
  const occurrenceMap = new Map<string,number>();

  for (let rowIndex = headerRow + 1; rowIndex < matrix.length; rowIndex++) {
    const values = matrix[rowIndex];
    if (!values || !values.some(value => stringifyCell(value) !== "")) continue;

    const rawData: Record<string,string> = {};
    headers.forEach((header,index) => {
      if (header) rawData[header] = stringifyCell(values[index]);
    });

    const date = parseDateValue(values[dateIndex]);
    if (!date) continue;

    let signedAmount: number | null = null;
    if (amountIndex >= 0) signedAmount = parseAmount(values[amountIndex]);

    if ((signedAmount === null || signedAmount === 0) && (debitIndex >= 0 || creditIndex >= 0)) {
      const debit = debitIndex >= 0 ? Math.abs(parseAmount(values[debitIndex]) || 0) : 0;
      const credit = creditIndex >= 0 ? Math.abs(parseAmount(values[creditIndex]) || 0) : 0;
      if (credit > 0) signedAmount = credit;
      else if (debit > 0) signedAmount = -debit;
    }

    if (signedAmount === null || signedAmount === 0) continue;

    const descriptionParts = [
      descriptionIndex >= 0 ? stringifyCell(values[descriptionIndex]) : "",
      counterpartyIndex >= 0 ? stringifyCell(values[counterpartyIndex]) : "",
      referenceIndex >= 0 ? stringifyCell(values[referenceIndex]) : "",
    ].filter(Boolean);
    const description = [...new Set(descriptionParts)].join(" · ").slice(0, 500) || "Transakcja bankowa";

    const canonicalBase = JSON.stringify(Object.entries(rawData).map(([k,v]) => [normalize(k), normalize(v)]).sort());
    const occurrence = occurrenceMap.get(canonicalBase) || 0;
    occurrenceMap.set(canonicalBase, occurrence + 1);

    parsed.push({
      id: `row-${rowIndex}`,
      occurred_on: isoDate(date),
      transaction_type: signedAmount > 0 ? "income" : "expense",
      amount: Math.round(Math.abs(signedAmount) * 100) / 100,
      description,
      scope: defaultScope,
      category_id: null,
      source_id: null,
      include: true,
      import_hash: fingerprint(rawData, occurrence),
      raw_data: rawData,
    });
  }

  if (!parsed.length) throw new Error("Nie znaleziono żadnych poprawnych transakcji.");
  if (parsed.length > 3000) throw new Error("Wyciąg ma ponad 3000 transakcji. Podziel go na mniejsze pliki.");

  return {
    fileName: name,
    rows: parsed,
    detected: {
      headerRow: headerRow + 1,
      dateColumn: headers[dateIndex] || null,
      amountColumn: amountIndex >= 0 ? headers[amountIndex] : null,
      debitColumn: debitIndex >= 0 ? headers[debitIndex] : null,
      creditColumn: creditIndex >= 0 ? headers[creditIndex] : null,
      descriptionColumn: descriptionIndex >= 0 ? headers[descriptionIndex] : null,
    },
  };
}
