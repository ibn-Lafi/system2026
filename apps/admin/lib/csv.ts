// توليد ملف CSV بسيط (بدون أي مكتبة خارجية) — BOM بادئ لضمان عرض صحيح
// للنص العربي عند فتح الملف بإكسل مباشرة.
function escapeCsvValue(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(","));
  return "﻿" + lines.join("\r\n");
}
