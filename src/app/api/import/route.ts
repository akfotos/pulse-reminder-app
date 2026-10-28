import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';

export const runtime = 'nodejs';
function parseDelimited(text: string) {
  const delimiter = text.split('\n')[0].includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (c === delimiter && !quoted) { row.push(field.trim()); field = ''; }
    else if (c === '\n' && !quoted) { row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    let rows: string[][];
    if (file instanceof File) {
      if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Please use a file smaller than 5 MB.' }, { status: 400 });
      const buffer = Buffer.from(await file.arrayBuffer());
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'xlsx') {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as never);
        rows = [];
        workbook.worksheets[0]?.eachRow(row => {
          const cells: string[] = [];
          row.eachCell({ includeEmpty: true }, (cell, col) => { cells[col - 1] = cell.value instanceof Date ? cell.value.toISOString().slice(0, 10) : cell.text; });
          rows.push(cells);
        });
      } else if (extension === 'docx') {
        const result = await mammoth.extractRawText({ buffer });
        rows = parseDelimited(result.value);
      } else if (extension === 'csv' || extension === 'txt') rows = parseDelimited(buffer.toString('utf-8').replace(/^\uFEFF/, ''));
      else return NextResponse.json({ error: 'Supported files: .xlsx, .csv, .docx, and .txt' }, { status: 400 });
    } else rows = parseDelimited(String(form.get('text') || ''));
    if (rows.length < 2) return NextResponse.json({ error: 'Include a header row and at least one reminder. Use comma or tab separated columns.' }, { status: 400 });
    if (rows.length > 501) return NextResponse.json({ error: 'Import up to 500 reminders at a time.' }, { status: 400 });
    return NextResponse.json({ headers: rows[0], rows: rows.slice(1) });
  } catch {
    return NextResponse.json({ error: 'This file could not be read. Check the format and try again.' }, { status: 400 });
  }
}
