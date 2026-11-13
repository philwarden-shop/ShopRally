// Source (CoreBridge "Order Origination"). CoreBridge requires one on every estimate (Nov 10 test).
// SalesMax uses the same four values for its Source field, and pre-fills it from what it already knows.
// The salesperson can always change it before the estimate is created.
// IDs read from CoreBridge ExOrder/OrderOrigination on 2026-11-10 (fs0226).
export const ORIGINATIONS = {
  inbound: { id: 57, name: 'INBOUND — Customer initiated', short: 'Inbound' },
  newOutbound: { id: 43, name: 'NEW OUTBOUND — Salesperson initiated new accnt', short: 'New outbound' },
  expanded: { id: 69, name: 'EXPANDED — Salesperson uncovered additional oppty', short: 'Expanded' },
  reactivated: { id: 14, name: 'REACTIVATED - Salesperson restarted a dormant acct', short: 'Reactivated' },
};
export const SOURCE_OPTIONS = Object.values(ORIGINATIONS);
export const DORMANT_DAYS = 180; // Admin setting: no paid order in this many days = dormant

const INBOUND_CHANNELS = new Set(['website', 'web form', 'phone in', 'inbound call', 'inbound email', 'email in', 'walk-in', 'chat', 'referral', 'portal']);
const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);

// Decide the Source from how the lead or estimate started. Returns { key, id, name, short, reason }.
// Facts used (all optional):
//   startedBy: 'customer' | 'salesperson'   who made first contact for this project
//   channel: e.g. 'website', 'walk-in', 'inbound email', 'site visit', 'check-in', 'win-back'
//   sequence: the SalesMax sequence that produced it ('checkin' | 'winback' | 'prospect' | 'reorder' | 'needs')
//   paidOrders: number of paid orders this company has had before
//   lastPaidOrderAt: date of the company's last paid order
export function suggestOrigination(f = {}, today = new Date()) {
  const pick = (key, reason) => ({ key, ...ORIGINATIONS[key], reason });
  const channel = String(f.channel || '').toLowerCase();
  const customerStarted = f.startedBy === 'customer' || INBOUND_CHANNELS.has(channel);
  const paid = Number(f.paidOrders || 0);
  const dormant = paid > 0 && f.lastPaidOrderAt && daysBetween(f.lastPaidOrderAt, today) >= DORMANT_DAYS;

  if (customerStarted) return pick('inbound', `The customer reached out first${channel ? ` (${channel})` : ''}.`);
  if (f.sequence === 'winback' || dormant) return pick('reactivated', f.sequence === 'winback' ? 'Came from the Win-back sequence.' : `No paid order in ${DORMANT_DAYS}+ days before this.`);
  if (paid === 0) return pick('newOutbound', 'New account the salesperson started.');
  return pick('expanded', f.sequence ? `Salesperson found it through the ${f.sequence} sequence with an active customer.` : 'Salesperson found a new opportunity with an active customer.');
}

export const originationById = (id) => SOURCE_OPTIONS.find((o) => o.id === Number(id)) || null;
