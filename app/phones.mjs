// Phone index for matching calls to customers: one item per phone number (sk PHONE#<10 digits>), written as the
// CoreBridge history import saves customers and contacts. Fax numbers are skipped.
export const digits10 = (s) => { const d = String(s || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); return /^\d{10}$/.test(d) ? d : ''; };
export function phoneEntries(entity, r = {}) {
  const out = [];
  const add = (num, extra) => { const d = digits10(num); if (d) out.push({ phone: d, ...extra }); };
  const fromContact = (c, company = '') => {
    if (!c) return;
    const base = { contactId: c.contactId ?? null, accountId: c.accountId ?? null, name: [c.firstName, c.lastName].filter(Boolean).join(' ').trim(), company };
    add(c.officePhone, base); add(c.cellPhone, base);
    if (c.otherPhone && !/fax/i.test(String(c.otherPhoneType || ''))) add(c.otherPhone, base);
  };
  if (entity === 'contacts') fromContact(r);
  if (entity === 'customers') { fromContact(r.primaryAccountContact, r.companyName || ''); fromContact(r.billingContact, r.companyName || ''); }
  const seen = new Set();
  return out.filter((e) => !seen.has(e.phone) && seen.add(e.phone));
}
