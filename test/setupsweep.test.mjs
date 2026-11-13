import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupPage } from '../app/setup.mjs';

const user = { email: 'phil@example.com', name: 'Phil', role: 'admin' };

test('setup interview shows the mockup labels', () => {
  const h = setupPage({ user, answers: ['Yes, always'], at: 1 });
  for (const l of ['Skip and Start From the Standard FASTSIGNS Workflow', 'With Your Process Expert', 'about 10 minutes', 'Click a step to change it.', 'and you can change it later.', 'Go Back One Question', 'then you’ll see the full map', 'href="/setup/workflow?at=0"']) assert.ok(h.includes(l), l);
  assert.ok(!/<script(?![^>]*src=)(?![^>]*application\/json)/.test(h.split('</head>')[1] || h));
});

test('skip form posts to the skip route', () => {
  assert.ok(setupPage({ user }).includes('action="/setup/workflow/skip"'));
});
