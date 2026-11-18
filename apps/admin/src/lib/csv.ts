/** CSV for exports (RFC 4180 with CRLF), safe to open in a spreadsheet. Pure. */

/**
 * One cell. Text that a spreadsheet would run as a formula (starting with = + - @, a tab or a carriage return) gets a
 * leading apostrophe (OWASP "CSV injection"); cells with commas, quotes, line breaks or edge spaces are quoted. Numbers
 * and booleans are data, never formulas, so a negative number stays a number.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  let text = typeof value === 'string' ? value : JSON.stringify(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const csvRow = (cells: unknown[]): string => cells.map(csvCell).join(',');

export type CsvColumn<T> = { header: string; value: (row: T) => unknown };

/** The whole file: a UTF-8 byte-order mark (so spreadsheets read ₱ and accents), the header row, then the rows. */
export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const lines = [csvRow(columns.map((c) => c.header)), ...rows.map((row) => csvRow(columns.map((c) => c.value(row))))];
  return `﻿${lines.join('\r\n')}\r\n`;
}

/** "ugnaya-merchants-2026-11-07.csv" */
export const exportFileName = (what: string, day: string): string => `ugnaya-${what.replace(/[^a-z0-9-]/gi, '')}-${day}.csv`;
