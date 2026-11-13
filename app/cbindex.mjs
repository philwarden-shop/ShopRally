// Small lookup items so a CoreBridge customer page can list its contacts and orders without scanning everything:
// CC#<accountId>#<contactId> and CO#<customerId>#<orderId>. Written by the history import and a one-time backfill.
export function indexEntries(entity, r = {}) {
  if (entity === 'contacts' && r.accountId != null && r.contactId != null) return [{ sk: `CC#${r.accountId}#${r.contactId}`, data: { contactId: r.contactId, name: [r.firstName, r.lastName].filter(Boolean).join(' ').trim(), email: r.email || '', phone: r.officePhone || r.cellPhone || '', primary: !!r.isPrimary, billing: !!r.isBilling, active: r.isActive !== false, position: r.position || '' } }];
  if (entity === 'orders' && r.customerId != null && r.orderId != null) return [{ sk: `CO#${r.customerId}#${String(r.orderDueDate || r.createdDate || '').slice(0, 10)}#${r.orderId}`, data: { orderId: r.orderId, invoice: r.invoiceNumber || '', desc: String(r.orderDescription || '').slice(0, 140), status: r.status || '', total: r.orderTotal ?? null, balance: r.orderBalanceDue ?? null, due: String(r.orderDueDate || '').slice(0, 10), salesperson: r.orderSalesPerson || '', contact: r.orderContact || '' } }];
  return [];
}
