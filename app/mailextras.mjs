// Email writer extras: Booking Link, Help Me Write (rule-based starter, no outside AI) and the
// "follow-up task if no reply in 3 days" option on the composer.
import { esc } from './views.mjs';

export function cleanBooking(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (!/^https:\/\/[^\s<>"']+$/i.test(s) || s.length > 300) throw new Error('the booking link must start with https:// and have no spaces');
  return s;
}

export function bookingForm(link = '') {
  return `<section class="panel" id="booking" aria-label="Booking link"><h2 style="margin:0 0 8px;font-size:15px">Booking Link</h2><form method="post" action="/me/booking" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end"><label style="display:flex;flex-direction:column;font-size:12px;flex:1 1 280px">Your scheduling page (Google Calendar, Calendly, etc.)<input name="booking" type="url" value="${esc(link)}" placeholder="https://calendar.app.google/..." style="font:inherit;min-height:36px;border:1px solid #d5dbe5;border-radius:8px;padding:0 8px"></label><button class="btn primary">Save Booking Link</button></form><p style="margin:8px 0 0;font-size:12px;color:var(--mute)">The Booking Link button in the email writer drops this link into your message.</p></section>`;
}

export function bookingButton(link = '') {
  if (!link) return `<a class="btn" href="/me#booking" title="Add your scheduling page in My Profile">Add Booking Link</a>`;
  const ins = `<a href="${esc(link)}">Book a time with me</a>`;
  return `<button type="button" class="btn" data-insert="${esc(ins)}" data-insert-text="${esc('Book a time with me: ' + link)}" title="${esc(link)}">Booking Link</button>`;
}

const stageOf = (lane = '') => {
  const l = String(lane).toLowerCase();
  if (/proof|design|art/.test(l)) return 'proof';
  if (/estimate|quote|bid|proposal/.test(l)) return 'estimate';
  if (/prod|progress|built|install|ready|ship/.test(l)) return 'production';
  if (/prospect|lead|new|discover/.test(l)) return 'prospect';
  return 'general';
};

// Builds a short starting draft from the customer's open project. The salesperson edits it before sending.
export function helpMeWrite({ first = '', company = '', project = '', lane = '', salesperson = '', booking = '' } = {}) {
  const hi = `Hi ${first || 'there'},`;
  const job = project ? `the ${project}` : 'your project';
  const book = booking ? `\nIf it's easier, you can pick a time here: ${booking}` : '';
  const sign = salesperson ? `\n\n${String(salesperson).split(' ')[0]}` : '';
  const lines = {
    prospect: `Thanks for talking with us about ${company ? company + "'s" : 'your'} signs. To put together options and pricing, I'd like to get a few details: sizes, where the signs will go, and when you need them.\n\nWould a quick call or a visit to measure work this week?${book}`,
    estimate: `I'm following up on the estimate for ${job}. Do you have any questions, or anything you'd like changed (size, material, quantity)?\n\nOnce it's approved, we'll start on the proof.${book}`,
    proof: `The proof for ${job} is ready for your review. Please check spelling, phone numbers, colors and sizes, then reply with your approval or any changes.\n\nWe start production after the proof is approved.`,
    production: `Quick update on ${job}: it's in production now. I'll let you know as soon as it's ready${/install/i.test(lane) ? ' and confirm the install date' : ' for pickup or install'}.\n\nIs there anything else you need from us in the meantime?`,
    general: `I wanted to check in on ${job}. Is there anything we can help with right now?${book}`,
  };
  return `${hi}\n\n${lines[stageOf(lane)]}${sign}`;
}

const addDays = (ymd, n) => { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// One follow-up task per sent email, due 3 days after it goes out.
export function followUpTask(tasks, { mailId, subject = '', to = '', customer = '', projectId = '', sentYmd }) {
  const id = `fu-${mailId}`;
  if (!mailId || tasks.some((t) => t.id === id)) return tasks;
  return [...tasks, { id, kind: 'email', title: `Follow up if no reply: ${String(subject).slice(0, 100)}`, customer: customer || to, projectId: String(projectId || ''), due: addDays(sentYmd, 3), done: false, followUp: true, mailId }];
}
