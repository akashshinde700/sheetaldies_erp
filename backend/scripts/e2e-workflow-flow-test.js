#!/usr/bin/env node
/* eslint-disable no-console */
require('dotenv').config();

const jwt = require('jsonwebtoken');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const ADMIN_USER_ID = parseInt(process.env.E2E_ADMIN_USER_ID || '1', 10);
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@sheetaldies.com';
const ADMIN_NAME = process.env.E2E_ADMIN_NAME || 'Admin';
const MAX_STEPS = parseInt(process.env.E2E_MAX_STEPS || '60', 10);

const makeToken = () => {
  const fromEnv = process.env.E2E_TOKEN;
  if (fromEnv) return fromEnv;
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required in .env for local token generation.');
  return jwt.sign(
    { id: ADMIN_USER_ID, email: ADMIN_EMAIL, role: 'ADMIN', name: ADMIN_NAME },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
};

const token = makeToken();
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`[${method}] ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function ensureTemplate() {
  const list = await api('/workflows/templates');
  const existing = (list.data || []).find((t) => t.code === 'VHT_STD');
  if (existing) {
    console.log(`Template found: VHT_STD (id=${existing.id})`);
    return existing.id;
  }
  const seeded = await api('/workflows/templates/seed/vht-standard', { method: 'POST' });
  console.log(`Template seeded: VHT_STD (id=${seeded.data.id})`);
  return seeded.data.id;
}

async function pickJobCardId() {
  const cardsRes = await api('/jobcards?limit=50&page=1');
  const cards = cardsRes.data || [];
  if (!cards.length) throw new Error('No job cards found. Create at least one job card before running E2E.');

  for (const c of cards) {
    try {
      const tl = await api(`/workflows/jobs/${c.id}/timeline`);
      if (!tl?.data?.id) return c.id;
    } catch {
      return c.id; // timeline missing = no workflow yet
    }
  }
  throw new Error('All listed job cards already have workflows. Create a fresh job card and rerun.');
}

async function startWorkflow(jobCardId, templateId) {
  try {
    const start = await api(`/workflows/jobs/${jobCardId}/start`, {
      method: 'POST',
      body: { templateId, remarks: 'E2E workflow test run' },
    });
    console.log(`Workflow started for jobCard=${jobCardId}`);
    return start.data;
  } catch (err) {
    if (!String(err.message).includes('already started')) throw err;
    console.log(`Workflow already exists for jobCard=${jobCardId}, continuing existing instance.`);
    return null;
  }
}

async function getMachineId() {
  const r = await api('/machines');
  const machines = r.data || [];
  return machines.length ? machines[0].id : null;
}

async function runFlow(jobCardId) {
  const machineId = await getMachineId();
  let didRework = false;

  for (let i = 1; i <= MAX_STEPS; i += 1) {
    const state = await api(`/workflows/jobs/${jobCardId}/allowed-actions`);
    const wfStatus = state.data.workflowStatus;
    const step = state.data.currentStep;
    const actions = state.data.actions || [];

    if (!step) {
      if (wfStatus === 'COMPLETED') {
        console.log('Workflow completed successfully.');
        return;
      }
      throw new Error(`No current step but workflow status=${wfStatus}`);
    }

    console.log(`Step ${i}: ${step.stepCode} | actions=${actions.join(',')}`);

    if (actions.includes('START_STEP')) {
      const startPayload = {
        operatorName: 'E2E Bot',
        remarks: `Started by E2E script at step ${step.stepCode}`,
        inputData: {
          needsAging: false,
        },
      };
      if (step.requiresMachine) {
        if (!machineId) throw new Error(`Step ${step.stepCode} requires machine but no machine exists.`);
        startPayload.machineId = machineId;
      }
      await api(`/workflows/jobs/${jobCardId}/steps/${step.id}/start`, {
        method: 'POST',
        body: startPayload,
      });
      console.log(`  - started ${step.stepCode}`);
    }

    if (actions.includes('COMPLETE_STEP')) {
      const completePayload = {
        observations: `Completed by E2E script (${step.stepCode})`,
        remarks: 'E2E completion',
        outputData: {
          needsAging: false,
        },
      };

      if (step.requiresQc) {
        if (step.stepCode === 'FINAL_INSPECTION' && !didRework) {
          completePayload.qcResult = 'FAIL';
        } else {
          completePayload.qcResult = 'PASS';
        }
      }

      const completeRes = await api(`/workflows/jobs/${jobCardId}/steps/${step.id}/complete`, {
        method: 'POST',
        body: completePayload,
      });
      console.log(`  - completed ${step.stepCode}`);

      if (completeRes.actionRequired === 'TRIGGER_REWORK') {
        await api(`/workflows/jobs/${jobCardId}/rework`, {
          method: 'POST',
          body: { reason: 'E2E fail-path validation', qcResult: 'FAIL' },
        });
        didRework = true;
        console.log('  - rework triggered');
      }
    }
  }

  throw new Error(`Flow did not complete in ${MAX_STEPS} iterations.`);
}

async function printTimeline(jobCardId) {
  const tl = await api(`/workflows/jobs/${jobCardId}/timeline`);
  const runs = tl.data.stepsTracking || [];
  console.log('\nTimeline summary:');
  console.log(`- workflowStatus: ${tl.data.status}`);
  console.log(`- totalStepRuns: ${runs.length}`);
  const reworkHits = runs.filter((r) => r.workflowStep?.stepCode === 'REWORK_ANNEALING').length;
  console.log(`- reworkRuns: ${reworkHits}`);
}

async function main() {
  console.log(`Base URL: ${BASE_URL}`);
  await api('/health', { method: 'GET' }); // quick server/auth sanity

  const templateId = await ensureTemplate();
  const jobCardId = await pickJobCardId();
  console.log(`Selected jobCardId=${jobCardId}`);

  await startWorkflow(jobCardId, templateId);
  await runFlow(jobCardId);
  await printTimeline(jobCardId);

  console.log('\nE2E workflow API test PASSED.');
}

main().catch((err) => {
  console.error('\nE2E workflow API test FAILED.');
  console.error(err.message || err);
  process.exit(1);
});
