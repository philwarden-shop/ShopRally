// Project Notes and Tasks tabs (mockup ProjectRecord): notes with author and time; this project's open tasks with add / done.
import { esc } from './views.mjs';
export function addNote(list = [], text, { by, at }) {
  const t = String(text || '').trim();
  if (t.length < 2) throw new Error('write a note first');
  return [{ id: 'n' + Date.parse(at).toString(36) + Math.floor(Math.random() * 1e4), by: String(by || ''), at, text: t.slice(0, 4000) }, ...list].slice(0, 200);
}
const when = (iso) => new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
export function notesHtml(pid, notes = []) {
  return `<section class="panel" aria-label="Project notes"><h2 style="margin:0 0 8px;font-size:16px">Notes · ${notes.length}</h2>
<form method="post" action="/projects/${esc(pid)}/notes" style="display:flex;flex-direction:column;gap:6px;margin:0 0 10px"><label style="position:absolute;left:-9999px" for="note-${esc(pid)}">New note</label><textarea id="note-${esc(pid)}" name="text" rows="3" required minlength="2" placeholder="Add a note for the team. Type @ and a name to notify someone (e.g. @Kristin)." style="font:inherit;border:1px solid #d5dbe5;border-radius:8px;padding:8px"></textarea><div><button class="btn primary">Add Note</button></div></form>
${notes.length ? `<ul style="list-style:none;margin:0;padding:0">${notes.map((n) => `<li style="border-top:1px solid #eef1f5;padding:8px 0;font-size:13px"><div style="color:var(--mute);font-size:12px"><b style="color:var(--ink)">${esc(n.by)}</b> · ${esc(when(n.at))}</div><div style="white-space:pre-wrap">${esc(n.text)}</div></li>`).join('')}</ul>` : '<p style="margin:0;color:var(--mute);font-size:13px">No notes yet.</p>'}</section>`;
}
export function projectTasksHtml2(pid, tasks = [], today) {
  const mine = tasks.filter((t) => t.projectId === pid && !t.done).sort((a, b) => String(a.due).localeCompare(String(b.due)));
  const done = tasks.filter((t) => t.projectId === pid && t.done).slice(-5);
  const back = `/projects/${pid}?mode=demo&tab=tasks`;
  const row = (t) => `<div style="display:flex;gap:10px;align-items:center;border-top:1px solid #eef1f5;padding:8px 0;font-size:13px"><form method="post" action="/activities/tasks/${esc(t.id)}/done" style="margin:0"><input type="hidden" name="back" value="${esc(back)}"><button data-free aria-label="Mark “${esc(t.title)}” done" style="width:22px;height:22px;border:2px solid #9aa6bd;border-radius:4px;background:#fff;cursor:pointer"></button></form><span style="flex:1 1 auto">${esc(t.title)}</span><span style="font-weight:600;color:${t.due < today ? '#a8343f' : t.due === today ? '#874511' : '#5a6478'}">${esc(t.due === today ? 'Today' : t.due)}</span></div>`;
  return `<section class="panel" aria-label="Project tasks"><h2 style="margin:0 0 8px;font-size:16px">Tasks · ${mine.length} open</h2>
<form method="post" action="/activities/tasks/new" style="display:grid;grid-template-columns:1fr 150px 120px auto;gap:8px;align-items:end;margin:0 0 6px"><input type="hidden" name="projectId" value="${esc(pid)}"><input type="hidden" name="back" value="${esc(back)}"><label style="display:flex;flex-direction:column;font-size:12px">New task<input name="title" required minlength="2" maxlength="140" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><label style="display:flex;flex-direction:column;font-size:12px">Due<input type="date" name="due" value="${esc(today)}" style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><label style="display:flex;flex-direction:column;font-size:12px">Kind<select name="kind" style="font:inherit;min-height:36px"><option value="task">Task</option><option value="call">Call</option><option value="email">Email</option><option value="proof">Proof</option><option value="quote">Quote Request</option></select></label><button class="btn primary">Add Task</button></form>
${mine.map(row).join('') || '<p style="margin:6px 0 0;color:var(--mute);font-size:13px">No open tasks. Every open job needs a next step.</p>'}${done.length ? `<details style="margin-top:8px"><summary style="cursor:pointer;font-size:12px;font-weight:700">Done Recently · ${done.length}</summary>${done.map((t) => `<div style="font-size:12px;color:var(--mute);padding:4px 0;text-decoration:line-through">${esc(t.title)}</div>`).join('')}</details>` : ''}</section>`;
}

// @mentions in a note: "@Kristin" or "@kristin-ames" matches a teammate by first name, full name or key.
export function mentionsIn(text, team = []) {
  const tags = [...String(text || '').matchAll(/@([A-Za-z][\w.-]*)/g)].map((m) => m[1].toLowerCase());
  if (!tags.length) return [];
  return team.filter((t) => { const first = String(t.name || '').split(' ')[0].toLowerCase(); const full = String(t.name || '').toLowerCase().replace(/\s+/g, '-'); return tags.some((g) => g === first || g === full || g === String(t.key || '').toLowerCase()); });
}
export function mentionTask(tasks, { note, by, project, today, id = 'mn' + Date.now().toString(36) }) {
  return [...tasks, { id, kind: 'task', title: `${by} mentioned you: ${String(note).replace(/\s+/g, ' ').slice(0, 90)}`, customer: project.company || '', projectId: project.id, due: today, done: false, mention: true }];
}
