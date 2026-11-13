// Company and Contact must exist in CoreBridge before SalesMax drafts an estimate.
// New prospects added in SalesMax are matched against CoreBridge first; only if there is no match
// does SalesMax post a new Company + Contact (contact type DO NOT MAIL until their first paid order).
// Tax group comes from the company's state (CoreBridge ExSalesCenter/GetTaxGroups, read Nov 10).

export const CONTACT_TYPES = { doNotMail: 6, active: 4, prospect: 1, hotProspect: 2, referral: 3, deactivated: 5 };
export const LOCATION = { id: 2, salesCenterNumber: '330301' };

// Northern Kentucky tax groups by state. KY is the location default (6%); other states are "<State> Shipment" (0%).
export const TAX_GROUPS = {
  KY: [11, 'Kentucky State Tax'], AL: [15, 'Alabama Shipment'], AZ: [16, 'Arizona Shipment'], AR: [54, 'Arkansas Shipment'],
  CA: [17, 'California Shipment'], CO: [18, 'Colorado Shipment'], CT: [19, 'Connecticut Shipment'], FL: [20, 'Florida Shipment'],
  GA: [21, 'Georgia Shipment'], IL: [22, 'Illinois Shipment'], IN: [23, 'Indiana Shipment'], KS: [24, 'Kansas Shipment'],
  LA: [26, 'Louisiana Shipment'], ME: [28, 'Maine Shipment'], MD: [48, 'Maryland Shipment'], MA: [27, 'Massachusetts Shipment'],
  MI: [29, 'Michigan Shipment'], MN: [30, 'Minnesota Shipment'], MS: [32, 'Mississippi Shipment'], MO: [31, 'Missouri Shipment'],
  NV: [36, 'Nevada Shipment'], NH: [34, 'New Hampshire Shipment'], NJ: [35, 'New Jersey Shipment'], NM: [47, 'New Mexico Shipment'],
  NY: [37, 'New York Shipment'], NC: [33, 'North Carolina Shipment'], OH: [38, 'Ohio Shipment'], OK: [51, 'Oklahoma Shipment'],
  OR: [39, 'Oregon Shipment'], PA: [40, 'Pennsylvania Shipment'], RI: [41, 'Rhode Island Shipment'], SC: [52, 'So. Carolina Shipment'],
  TN: [49, 'Tennessee Shipment'], TX: [42, 'Texas Shipment'], UT: [43, 'Utah Shipment'], VT: [50, 'Vermont Shipment'],
  VA: [44, 'Virginia Shipment'], WA: [46, 'Washington Shipment'], WI: [45, 'Wisconsin Shipment'], WY: [55, 'Wyoming Shipment'],
};
export const TAX_EXEMPT = [14, 'Local Tax Exempt'];
export const TAX_DEFAULT = [11, 'Kentucky State Tax'];

export function taxGroupFor(company = {}) {
  if (company.taxExempt) return { id: TAX_EXEMPT[0], name: TAX_EXEMPT[1], reason: 'Company is tax exempt' };
  const st = String(company.state || '').trim().toUpperCase();
  if (TAX_GROUPS[st]) return { id: TAX_GROUPS[st][0], name: TAX_GROUPS[st][1], reason: `Company address is in ${st}` };
  return { id: TAX_DEFAULT[0], name: TAX_DEFAULT[1], reason: st ? `No tax group for ${st}; using the location default. Check it.` : 'No state on the company; using the location default. Check it.', check: true };
}

const norm = (s) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/\b(inc|llc|co|corp|company|the|ltd)\b\.?/g, '').replace(/[^a-z0-9]/g, '');
const digits = (s) => String(s || '').replace(/\D/g, '').slice(-10);

// Compare a SalesMax company with CoreBridge search results. Exact = same name, or same phone/email domain + similar name.
export function matchCompany(company, cbResults = []) {
  const n = norm(company.name); const ph = digits(company.phone); const dom = String(company.email || '').split('@')[1] || '';
  const scored = cbResults.map((r) => {
    let score = 0;
    if (norm(r.companyName) === n && n) score += 3;
    else if (n && (norm(r.companyName).includes(n) || n.includes(norm(r.companyName)))) score += 1;
    if (ph && digits(r.companyPhone) === ph) score += 2;
    const rd = String(r.primaryAccountContact?.email || '').split('@')[1] || '';
    if (dom && rd === dom && !/gmail|yahoo|hotmail|outlook|aol|icloud/.test(dom)) score += 2;
    return { r, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  if (scored[0] && scored[0].score >= 3 && !(scored[1] && scored[1].score >= 3)) return { result: 'match', accountId: scored[0].r.accountId, name: scored[0].r.companyName };
  if (scored.length) return { result: 'possible', candidates: scored.slice(0, 3).map((x) => ({ accountId: x.r.accountId, name: x.r.companyName })) };
  return { result: 'none' };
}

// What has to happen before the estimate can be drafted.
export function planCustomerSync({ company = {}, contact = {}, match = { result: 'none' } }) {
  if (company.cbAccountId && contact.cbContactId) return { ready: true, steps: [] };
  const steps = [];
  if (!company.cbAccountId) {
    if (match.result === 'match') steps.push({ do: 'link', accountId: match.accountId, say: `Link to existing CoreBridge company "${match.name}"` });
    else if (match.result === 'possible') steps.push({ do: 'ask', candidates: match.candidates, say: 'Salesperson picks the right CoreBridge company, or confirms it is new' });
    else steps.push({ do: 'createCompany', say: `Create company "${company.name}" in CoreBridge with ${contact.firstName || 'the'} ${contact.lastName || 'contact'} as primary contact (DO NOT MAIL)` });
  } else if (!contact.cbContactId) {
    steps.push({ do: 'createContact', say: `Add ${contact.firstName} ${contact.lastName} to the CoreBridge company (DO NOT MAIL)` });
  }
  return { ready: false, steps };
}

export function buildCreateCustomer({ company, contact, salespersonId }) {
  return {
    companyName: company.name, companyPhone: company.phone || undefined, companyWebsite: company.website || undefined,
    companyLocationId: LOCATION.id, salesCenterLocationNumber: LOCATION.salesCenterNumber,
    companySalesPersonId: salespersonId || undefined, taxExempt: Boolean(company.taxExempt), isActive: true,
    primaryAccountContact: {
      firstName: contact.firstName, lastName: contact.lastName, email: contact.email || undefined,
      officePhone: contact.phone || undefined, contactTypeId: CONTACT_TYPES.doNotMail, isPrimary: true, isBilling: true, isActive: true,
    },
  };
}

export function buildCreateContact({ accountId, contact }) {
  return { CustomerId: accountId, FirstName: contact.firstName, LastName: contact.lastName, Email: contact.email || '',
    OfficePhone: contact.phone || undefined, contactTypeId: CONTACT_TYPES.doNotMail, IsActive: true };
}

// First paid order: DO NOT MAIL -> Active.
export const activateContact = (contactId) => ({ contactId, contactTypeId: CONTACT_TYPES.active });

// An estimate can only be drafted once both have CoreBridge IDs.
export const readyForEstimate = (company = {}, contact = {}) => Boolean(company.cbAccountId && contact.cbContactId);
