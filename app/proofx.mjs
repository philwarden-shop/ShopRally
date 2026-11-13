// Proof versions: the file lives in Google Drive; SalesMax keeps the link, version number, note and who added it.
import { esc } from './views.mjs';

const DRIVE = /^https:\/\/(drive|docs)\.google\.com\/[^\s<>"']+$/;

export function addProofVersion(list, f, { by, at, startAt = 0 }) {
  const link = String(f.link || '').trim();
  if (!DRIVE.test(link)) throw new Error('paste the Google Drive link to the proof file');
  const note = String(f.note || '').trim().slice(0, 500);
  const v = Math.max(startAt, ...(list || []).map((p) => p.v)) + 1;
  return [...(list || []), { v, link, note, by, at }];
}

export function latestLink(list) { return (list || []).length ? list[list.length - 1] : null; }

export function versionsHtml(itemId, list, demo = []) {
  const all = [...demo.map((d) => ({ v: d.v, file: d.file })), ...(list || [])].sort((a, b) => b.v - a.v);
  const rows = all.map((p) => `<li style="padding:6px 0;border-top:1px solid #eef1f5"><b>v${p.v}</b> · ${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">Open in Google Drive</a>` : esc(p.file || '')}${p.note ? ` · ${esc(p.note)}` : ''}${p.by ? ` <small style="color:var(--mute)">· ${esc(String(p.by).split('@')[0])}</small>` : ''}</li>`).join('');
  return `<section class="panel" aria-label="Proof versions" style="max-width:760px"><h2 style="margin:0 0 6px;font-size:15px">Proof Versions · ${all.length}</h2><ul style="list-style:none;margin:0;padding:0;font-size:13px">${rows}</ul>
<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">+ Add New Proof Version</summary><form method="post" action="/items/${esc(itemId)}/proof-version" style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
<label style="display:flex;flex-direction:column;font-size:12px">Google Drive link to the proof<input name="link" type="url" required placeholder="https://drive.google.com/…" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label>
<label style="display:flex;flex-direction:column;font-size:12px">What changed<input name="note" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label>
<button class="btn primary" style="align-self:flex-start">Add Version</button><span style="font-size:12px;color:var(--mute)">The file stays in Google Drive. SalesMax only keeps the link.</span></form></details></section>`;
}
