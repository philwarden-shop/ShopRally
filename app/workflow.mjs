// The reconciled SalesMax workflow (see "SalesMax Workflow Reconciliation", Nov 10).
// Each step says which board shows it. SalesMax owns the workflow; CoreBridge hears about only a few moments (CB_SYNC).
// Sub-statuses are not used in CoreBridge; they live here as steps, stations and hold reasons.

export const STEPS = [
  { id: 'prep', name: 'Prepare for design', stage: 'Planning', board: 'design', owner: 'Salesperson', cb: null, color: '#5a6478' },
  { id: 'queue', name: 'Waiting for design', stage: 'Design', board: 'design', owner: 'Design team (pull when ready)', cb: null, color: '#9aa6bd' },
  { id: 'indesign', name: 'In design', stage: 'Design', board: 'design', owner: 'Designer', cb: null, color: '#6b4fa0', limit: 4 },
  { id: 'proofqc', name: 'Proof review', stage: 'Design', board: 'design', owner: 'Automatic', cb: null, color: '#1d4f91' },
  { id: 'salesrev', name: 'Sales proof review', stage: 'Design', board: 'design', owner: 'Salesperson', cb: null, color: '#3d4658' },
  { id: 'proofwait', name: 'Awaiting customer approval', stage: 'Design', board: 'design', owner: 'Customer', cb: null, color: '#5b3f8c' },
  { id: 'files', name: 'Production files', stage: 'Design', board: 'design', owner: 'Designer', cb: null, color: '#1f6a43' },
  { id: 'wip', name: 'WIP', stage: 'Produce', board: 'production', owner: 'Production (Assigned to)', cb: null, color: '#1d4f91' },
  { id: 'vended', name: 'Vended product', stage: 'Produce', board: 'production', owner: 'Salesperson', cb: null, color: '#7a5600' },
  { id: 'qc', name: 'Quality control', stage: 'QC', board: 'production', owner: 'Salesperson', cb: null, color: '#c88a12' },
  { id: 'built', name: 'Built: hand-off', stage: 'Built', board: 'production', owner: 'Production', cb: 'BUILT', color: '#1f6a43' },
  { id: 'done', name: 'Complete', stage: 'Complete', board: 'none', owner: 'Salesperson', cb: 'COMPLETED', color: '#1f6a43' },
];

// Holds live in SalesMax's queues. Nothing is sent to CoreBridge; the item keeps its last CoreBridge status.
export const HOLD = { id: 'hold', name: 'On hold', stage: 'Any', board: 'both', owner: 'Whoever placed it', cb: null, color: '#a8343f' };
export const ALL_STEPS = [...STEPS, HOLD];

// The only status hand-offs with CoreBridge. Labels are settings (Admin > CoreBridge sync), not code.
export const CB_SYNC = {
  onConvert: { order: 'WIP', product: 'ORDER REVIEW' }, // estimate becomes an order
  built: 'BUILT',            // SalesMax item reaches Built -> CoreBridge product status
  complete: 'COMPLETED',     // SalesMax item reaches Complete -> CoreBridge product status
  closedFromCoreBridge: 'CLOSED', // CoreBridge order closed -> SalesMax closes the project
};
export const stepById = (id) => ALL_STEPS.find((s) => s.id === id) || null;

export const HOLD_REASONS = ['Need info: customer', 'Need info: sales', 'Need info: vendor', 'Need info: production', 'Need info: site survey', 'Waiting for artwork', 'Waiting for county/city', 'Waiting on freight charges', 'Waiting for vended quote'];

// What CoreBridge shows for an item: a held item keeps the status of the step it was on.
export function cbStatusOf(item) {
  const st = stepById(item.step === 'hold' ? item.heldFrom : item.step);
  return st?.cb || CB_SYNC.onConvert.product;
}

export function boardSteps(board) {
  return STEPS.filter((s) => s.board === board);
}

// Where an item may go next from a step (forward, back for rework, or hold).
// First entry = the normal next step (shown first in the Move menu).
export const TRANSITIONS = {
  prep: ['queue', 'wip', 'vended'],
  queue: ['indesign', 'prep'],
  indesign: ['proofqc', 'queue'],
  proofqc: ['salesrev', 'indesign'],
  salesrev: ['proofwait', 'indesign'],
  proofwait: ['files', 'indesign'],
  files: ['wip', 'vended'],
  wip: ['qc', 'vended'],
  vended: ['qc', 'wip'],
  qc: ['built', 'wip', 'indesign'],
  built: ['done'],
  done: [],
};

export function nextSteps(fromId, heldFrom) {
  if (fromId === 'hold') {
    const back = stepById(heldFrom);
    return [back, ...STEPS.filter((s) => s.id !== heldFrom && s.id !== 'done')].filter(Boolean);
  }
  const out = (TRANSITIONS[fromId] || []).map(stepById);
  if (fromId !== 'done') out.push(HOLD);
  return out.filter(Boolean);
}

// CoreBridge order status from its items: any WIP item keeps it WIP; Built only when all are Built (or done).
export function orderCbStatus(items) {
  if (!items.length) return 'ESTIMATE';
  const st = items.map((it) => cbStatusOf(it) || 'ESTIMATE');
  if (st.every((s) => s === 'COMPLETED')) return 'COMPLETED';
  if (st.every((s) => s === 'BUILT' || s === 'COMPLETED')) return 'BUILT';
  return 'WIP';
}

// Production keeps its queues in a list; Design starts on the board.
export const LIST_COLUMNS = {
  design: [
    { key: 'due', label: 'Due', lock: true }, { key: 'ref', label: 'Order · item' }, { key: 'title', label: 'Item', lock: true },
    { key: 'customer', label: 'Customer' }, { key: 'step', label: 'Step' }, { key: 'person', label: 'Designer' },
    { key: 'note', label: 'Notes' }, { key: 'flags', label: 'Flags' }, { key: 'sales', label: 'Salesperson', hidden: true }, { key: 'cb', label: 'CoreBridge status', hidden: true },
  ],
  production: [
    { key: 'due', label: 'Due', lock: true }, { key: 'ref', label: 'Order · item' }, { key: 'title', label: 'Item', lock: true },
    { key: 'customer', label: 'Customer' }, { key: 'step', label: 'Step' }, { key: 'person', label: 'Assigned to' },
    { key: 'note', label: 'Notes' }, { key: 'flags', label: 'Flags' }, { key: 'station', label: 'Station' },
    { key: 'handoff', label: 'Destination' }, { key: 'qty', label: 'Qty', hidden: true }, { key: 'cb', label: 'CoreBridge status', hidden: true },
  ],
};

export function visibleColumns(board, hiddenKeys) {
  const cols = LIST_COLUMNS[board] || [];
  const hidden = hiddenKeys == null ? new Set(cols.filter((c) => c.hidden).map((c) => c.key)) : new Set(hiddenKeys);
  return cols.map((c) => ({ ...c, on: c.lock || !hidden.has(c.key) }));
}

// Rule "In-house or vended?": vended when any part is named "Vended - ..." or the product's Vended box is checked in CoreBridge.
// (The exact CoreBridge field names get confirmed on the first live product read; all likely spellings are accepted.)
export function isVended(product = {}) {
  const flag = product.IsVended ?? product.isVended ?? product.Vended ?? product.vended ?? product.ProductVended;
  if (flag === true || flag === 'true' || flag === 1) return true;
  const parts = product.Parts || product.parts || product.ExOrderProductParts || [];
  return parts.some((p) => /^\s*vended\s*-/i.test(String(p.Name || p.name || p.PartName || p.Description || '')));
}
export const routeToProduce = (product) => (isVended(product) ? 'vended' : 'wip');

// Hand-off tasks from CoreBridge destinations (ExDestinations/GetByOrderId).
// Ship: when every item on that destination is Built, the assigned salesperson gets "Book shipping" (XPS or ATS for LTL).
// The task closes itself once CoreBridge shows a tracking number (XPS writes it) or a PRO number is entered for ATS.
export function handoffTasks(destination, itemStepByProductId) {
  const type = String(destination.OrderAddressTypeName || '').toLowerCase();
  const ids = (destination.Items || []).map((i) => i.OrderProductId);
  const allBuilt = ids.length > 0 && ids.every((id) => ['built', 'done'].includes(itemStepByProductId[id]));
  if (!allBuilt) return [];
  const tracked = Boolean(destination.IsXPSShipped || destination.XPSTrackingNumbers || (destination.ShipmentTrackingNumbers || '').length);
  if (type === 'ship') return tracked ? [] : [{ kind: 'book-shipping', owner: 'salesperson', title: 'Book shipping (XPS, or ATS for LTL freight)', destinationId: destination.Id }];
  if (type === 'pickup') return [{ kind: 'pickup-notice', owner: 'automation', title: 'Send ready-for-pickup email', destinationId: destination.Id }];
  return [];
}

// Automatic proof review loop. A proof upload while In design moves the item to Proof review and runs the checks.
// Clean result -> Sales proof review on its own. Issues -> back to the designer with the list; the next upload re-runs it.
export function onProofUploaded(item) {
  return ['indesign', 'proofqc'].includes(item.step) ? { to: 'proofqc', runReview: true } : { to: item.step, runReview: false };
}
export function proofReviewOutcome(result = {}) {
  const issues = (result.issues || []).filter((i) => i && i.severity !== 'info');
  if (!issues.length) return { to: 'salesrev', notify: 'salesperson', note: 'Automatic review passed.' };
  return { to: 'indesign', notify: 'designer', note: `Automatic review found ${issues.length} issue${issues.length > 1 ? 's' : ''}: ` + issues.map((i) => i.text).join('; ') };
}

// QC: the salesperson QCs their own orders. Remote salespeople have QC delegates (Admin > Team); the task goes to them.
// Several delegates -> one shared task; the first to start it takes it.
export function qcTaskFor(item, { salesperson, delegates = {} } = {}) {
  if (item.step !== 'qc') return null;
  const who = delegates[salesperson] && delegates[salesperson].length ? delegates[salesperson] : [salesperson];
  return { kind: 'qc', title: `QC: ${item.name}`, assignees: who, onBehalfOf: who.includes(salesperson) ? null : salesperson, itemId: item.id, due: item.due };
}

// Safety net: every problem has an owner, a reason and a follow-up date. Anything past its follow-up date,
// or sitting in a step longer than its time target, shows on Risks > Stuck and escalates.
export const FOLLOW_UP_DAYS = { hold: 2, escalateAfter: 5 };
export const STEP_TARGET_DAYS = { prep: 2, queue: 2, indesign: 3, proofqc: 1, salesrev: 1, proofwait: 3, files: 1, wip: 4, vended: 10, qc: 1, built: 3 };
export function stuckItems(items, now = new Date()) {
  const days = (iso) => (now - new Date(iso)) / 86400000;
  const out = [];
  for (const it of items) {
    if (!it.movedAt || it.step === 'done') continue;
    const age = days(it.movedAt);
    if (it.step === 'hold') {
      if (age >= FOLLOW_UP_DAYS.hold) out.push({ id: it.id, why: `On hold ${Math.floor(age)} days: ${it.holdReason}`, escalate: age >= FOLLOW_UP_DAYS.escalateAfter });
    } else if (STEP_TARGET_DAYS[it.step] && age > STEP_TARGET_DAYS[it.step]) {
      out.push({ id: it.id, why: `${Math.floor(age)} days in ${stepById(it.step)?.name} (target ${STEP_TARGET_DAYS[it.step]})`, escalate: age > STEP_TARGET_DAYS[it.step] * 2 });
    }
  }
  return out;
}

// Tags fill themselves from CoreBridge data and SalesMax events. Only these automatic tags may route work.
export const ROUTING_TAGS = ['vended', 'handoff:ship', 'handoff:pickup', 'handoff:install', 'handoff:deliver', 'concept', 'design-revision'];
export function autoTags({ item = {}, product = {}, destination = null, customer = {}, today = new Date() } = {}) {
  const tags = new Set();
  if (isVended(product)) tags.add('vended');
  const type = String(destination?.OrderAddressTypeName || '').toLowerCase();
  if (['ship', 'pickup', 'install', 'deliver'].includes(type)) tags.add('handoff:' + type);
  const dueDays = item.due ? (new Date(item.due + 'T12:00:00') - today) / 86400000 : null;
  if (product.IsRush || product.Rush || (dueDays != null && dueDays <= 2 && item.step !== 'done')) tags.add('rush');
  if (item.revision) tags.add('design-revision');
  if (item.concept) tags.add('concept');
  if (customer.vip) tags.add('vip');
  if (customer.firstOrder) tags.add('first-order');
  return [...tags];
}
// Nightly check: what's missing that should be there.
export function missingTags(item, expected) {
  const have = new Set(item.tags || []);
  return expected.filter((t) => !have.has(t));
}

// QC issues: a fixed list (Admin > Tags). Picking one on "Fail QC" tags the item for reporting and sends it back
// to the step that owns the fix: design issues -> In design, production issues -> WIP.
export const QC_ISSUES = {
  design: ['Spelling/Grammar', 'Pixelated images', 'Wrong material', 'Wrong dimensions'],
  production: ['Banding', 'Finishing', 'Blurry', 'Splatter'],
};
export function failQc(item, issue) {
  const side = QC_ISSUES.design.includes(issue) ? 'design' : QC_ISSUES.production.includes(issue) ? 'production' : null;
  if (!side) throw new Error('pick a QC issue from the list');
  if (item.step !== 'qc') throw new Error('only items in Quality control can fail QC');
  return { to: side === 'design' ? 'indesign' : 'wip', tag: `qc:${side}:${issue}`, task: side === 'design' ? 'Fix proof and re-send' : 'Remake / fix', notify: side === 'design' ? 'designer' : 'production' };
}
