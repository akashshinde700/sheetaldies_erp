const prisma = require('../utils/prisma');

const CONDITION = {
  ALWAYS: 'ALWAYS',
  MATERIAL_TYPE_IN: 'MATERIAL_TYPE_IN',
  QC_PASS: 'QC_PASS',
  QC_FAIL: 'QC_FAIL',
  FIELD_EQUALS: 'FIELD_EQUALS',
};

const STEP_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
  FAILED: 'FAILED',
};

const QC_PASS_SET = new Set(['PASS', 'CONDITIONAL']);

const toInt = (v) => parseInt(v, 10);

const getJobWithWorkflow = async (jobCardId) => {
  return prisma.jobCard.findUnique({
    where: { id: jobCardId },
    include: {
      part: { select: { material: true } },
      workflow: {
        include: {
          template: true,
          currentStep: true,
        },
      },
    },
  });
};

const evaluateTransition = (transition, context) => {
  const { conditionType, conditionExpr } = transition;
  if (conditionType === CONDITION.ALWAYS) return true;
  if (conditionType === CONDITION.QC_PASS) return QC_PASS_SET.has(context.qcResult);
  if (conditionType === CONDITION.QC_FAIL) return context.qcResult === 'FAIL';
  if (conditionType === CONDITION.MATERIAL_TYPE_IN) {
    const values = Array.isArray(conditionExpr?.values) ? conditionExpr.values : [];
    return values.map((v) => String(v).toLowerCase()).includes(String(context.materialType || '').toLowerCase());
  }
  if (conditionType === CONDITION.FIELD_EQUALS) {
    const field = conditionExpr?.field;
    const value = conditionExpr?.value;
    if (!field) return false;
    return String(context[field] ?? '') === String(value ?? '');
  }
  return false;
};

const getNextTransition = async (templateId, fromStepId, context) => {
  const transitions = await prisma.workflowTransition.findMany({
    where: { templateId, fromStepId },
    orderBy: [{ priority: 'asc' }, { id: 'asc' }],
    include: { toStep: true },
  });
  return transitions.find((t) => evaluateTransition(t, context)) || null;
};

exports.createTemplate = async (req, res) => {
  try {
    const { code, name, description, industry, version, isDefault, steps = [], transitions = [] } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Template code and name are required.' });
    }
    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one workflow step is required.' });
    }

    const stepCodeToIndex = new Map();
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (!s.stepCode || !s.stepName || s.sequenceNo == null) {
        return res.status(400).json({ success: false, message: 'Each step needs stepCode, stepName, and sequenceNo.' });
      }
      if (stepCodeToIndex.has(s.stepCode)) {
        return res.status(400).json({ success: false, message: `Duplicate stepCode: ${s.stepCode}` });
      }
      stepCodeToIndex.set(s.stepCode, i);
    }

    const created = await prisma.$transaction(async (tx) => {
      const template = await tx.workflowTemplate.create({
        data: {
          code: String(code).toUpperCase(),
          name,
          description: description || null,
          industry: industry || null,
          version: version ? toInt(version) : 1,
          isDefault: Boolean(isDefault),
          createdById: req.user.id,
          updatedById: req.user.id,
        },
      });

      const createdSteps = [];
      for (const s of steps) {
        const row = await tx.workflowStep.create({
          data: {
            templateId: template.id,
            stepCode: s.stepCode,
            stepName: s.stepName,
            stepType: s.stepType || 'OPERATION',
            sequenceNo: toInt(s.sequenceNo),
            isMandatory: s.isMandatory !== false,
            isRepeatable: Boolean(s.isRepeatable),
            requiresMachine: Boolean(s.requiresMachine),
            requiresQc: Boolean(s.requiresQc),
            requiresFile: Boolean(s.requiresFile),
            allowParallel: Boolean(s.allowParallel),
            slaMinutes: s.slaMinutes != null ? toInt(s.slaMinutes) : null,
            configJson: s.configJson || null,
          },
        });
        createdSteps.push(row);
      }

      const stepIdByCode = new Map(createdSteps.map((s) => [s.stepCode, s.id]));
      for (const t of transitions) {
        const fromStepId = stepIdByCode.get(t.fromStepCode);
        const toStepId = stepIdByCode.get(t.toStepCode);
        if (!fromStepId || !toStepId) {
          throw new Error(`Transition references unknown step code (${t.fromStepCode} -> ${t.toStepCode}).`);
        }
        await tx.workflowTransition.create({
          data: {
            templateId: template.id,
            fromStepId,
            toStepId,
            conditionType: t.conditionType || 'ALWAYS',
            conditionExpr: t.conditionExpr || null,
            priority: t.priority != null ? toInt(t.priority) : 1,
            isReworkPath: Boolean(t.isReworkPath),
          },
        });
      }

      return template;
    });

    const full = await prisma.workflowTemplate.findUnique({
      where: { id: created.id },
      include: {
        steps: { orderBy: { sequenceNo: 'asc' } },
        transitions: true,
      },
    });
    return res.status(201).json({ success: true, data: full, message: 'Workflow template created.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
};

exports.listTemplates = async (req, res) => {
  try {
    const templates = await prisma.workflowTemplate.findMany({
      include: {
        _count: {
          select: { steps: true, transitions: true, jobWorkflows: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return res.json({ success: true, data: templates });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getTemplate = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const template = await prisma.workflowTemplate.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { sequenceNo: 'asc' } },
        transitions: {
          include: {
            fromStep: { select: { id: true, stepCode: true, stepName: true } },
            toStep: { select: { id: true, stepCode: true, stepName: true } },
          },
          orderBy: [{ priority: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!template) return res.status(404).json({ success: false, message: 'Workflow template not found.' });
    return res.json({ success: true, data: template });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.seedHeatTreatmentTemplate = async (req, res) => {
  try {
    const exists = await prisma.workflowTemplate.findFirst({
      where: { code: 'VHT_STD' },
    });
    if (exists) {
      return res.status(409).json({ success: false, message: 'VHT standard template already exists.' });
    }

    req.body = {
      code: 'VHT_STD',
      name: 'Vacuum Heat Treatment Standard',
      description: 'Standard flow with QC gates, optional aging, and rework loop.',
      industry: 'Vacuum Heat Treatment',
      version: 1,
      isDefault: true,
      steps: [
        { stepCode: 'INCOMING_JOB', stepName: 'Incoming Job', sequenceNo: 1 },
        { stepCode: 'MKT_SIGN', stepName: 'Information Sign from MKT', sequenceNo: 2 },
        { stepCode: 'INCOMING_INSPECTION', stepName: 'Incoming Inspection', stepType: 'INSPECTION', requiresQc: true, sequenceNo: 3 },
        { stepCode: 'JOB_PLANNING', stepName: 'Job Planning', sequenceNo: 4 },
        { stepCode: 'JOB_CLEANING', stepName: 'Job Cleaning', sequenceNo: 5 },
        { stepCode: 'STRESS_RELIEVING', stepName: 'Stress Relieving', requiresMachine: true, sequenceNo: 6 },
        { stepCode: 'LOADING_MASKING', stepName: 'Loading and Masking', sequenceNo: 7 },
        { stepCode: 'HEAT_TREATMENT', stepName: 'Heat Treatment Process', requiresMachine: true, sequenceNo: 8 },
        { stepCode: 'MULTI_TEMPERING', stepName: 'Multi Tempering', stepType: 'LOOP', isRepeatable: true, requiresMachine: true, sequenceNo: 9 },
        { stepCode: 'AGING_OPTIONAL', stepName: 'Aging (Optional)', sequenceNo: 10, isMandatory: false },
        { stepCode: 'FINAL_INSPECTION', stepName: 'Final Inspection', stepType: 'INSPECTION', requiresQc: true, sequenceNo: 11 },
        { stepCode: 'RP_OIL_STORAGE', stepName: 'Storage with RP Oil', sequenceNo: 12 },
        { stepCode: 'DISPATCH', stepName: 'Dispatch', stepType: 'DISPATCH', sequenceNo: 13 },
        { stepCode: 'REWORK_ANNEALING', stepName: 'Rework Annealing', stepType: 'LOOP', isRepeatable: true, requiresMachine: true, sequenceNo: 14 },
      ],
      transitions: [
        { fromStepCode: 'INCOMING_JOB', toStepCode: 'MKT_SIGN' },
        { fromStepCode: 'MKT_SIGN', toStepCode: 'INCOMING_INSPECTION' },
        { fromStepCode: 'INCOMING_INSPECTION', toStepCode: 'JOB_PLANNING', conditionType: 'QC_PASS' },
        { fromStepCode: 'INCOMING_INSPECTION', toStepCode: 'REWORK_ANNEALING', conditionType: 'QC_FAIL', isReworkPath: true },
        { fromStepCode: 'JOB_PLANNING', toStepCode: 'JOB_CLEANING' },
        { fromStepCode: 'JOB_CLEANING', toStepCode: 'STRESS_RELIEVING' },
        { fromStepCode: 'STRESS_RELIEVING', toStepCode: 'LOADING_MASKING' },
        { fromStepCode: 'LOADING_MASKING', toStepCode: 'HEAT_TREATMENT' },
        { fromStepCode: 'HEAT_TREATMENT', toStepCode: 'MULTI_TEMPERING' },
        { fromStepCode: 'MULTI_TEMPERING', toStepCode: 'AGING_OPTIONAL', conditionType: 'FIELD_EQUALS', conditionExpr: { field: 'needsAging', value: true }, priority: 1 },
        { fromStepCode: 'MULTI_TEMPERING', toStepCode: 'FINAL_INSPECTION', conditionType: 'FIELD_EQUALS', conditionExpr: { field: 'needsAging', value: false }, priority: 1 },
        { fromStepCode: 'AGING_OPTIONAL', toStepCode: 'FINAL_INSPECTION' },
        { fromStepCode: 'FINAL_INSPECTION', toStepCode: 'RP_OIL_STORAGE', conditionType: 'QC_PASS' },
        { fromStepCode: 'FINAL_INSPECTION', toStepCode: 'REWORK_ANNEALING', conditionType: 'QC_FAIL', isReworkPath: true },
        { fromStepCode: 'RP_OIL_STORAGE', toStepCode: 'DISPATCH' },
        { fromStepCode: 'REWORK_ANNEALING', toStepCode: 'HEAT_TREATMENT' },
      ],
    };

    return exports.createTemplate(req, res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.startJobWorkflow = async (req, res) => {
  try {
    const jobCardId = toInt(req.params.jobCardId);
    const { templateId, remarks } = req.body;
    if (!templateId) return res.status(400).json({ success: false, message: 'templateId is required.' });

    const job = await prisma.jobCard.findUnique({ where: { id: jobCardId }, include: { workflow: true } });
    if (!job) return res.status(404).json({ success: false, message: 'Job card not found.' });
    if (job.workflow) return res.status(409).json({ success: false, message: 'Workflow already started for this job card.' });

    const template = await prisma.workflowTemplate.findUnique({
      where: { id: toInt(templateId) },
      include: { steps: { orderBy: { sequenceNo: 'asc' } } },
    });
    if (!template || !template.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive workflow template.' });
    }
    if (!template.steps.length) return res.status(400).json({ success: false, message: 'Template has no steps.' });

    const firstStep = template.steps[0];
    const created = await prisma.$transaction(async (tx) => {
      const wf = await tx.jobWorkflow.create({
        data: {
          jobCardId,
          templateId: template.id,
          status: 'IN_PROGRESS',
          currentStepId: firstStep.id,
          startedAt: new Date(),
          startedById: req.user.id,
          remarks: remarks || null,
        },
      });
      await tx.jobStepTracking.create({
        data: {
          jobWorkflowId: wf.id,
          workflowStepId: firstStep.id,
          runNo: 1,
          status: STEP_STATUS.PENDING,
        },
      });
      return wf;
    });

    return res.status(201).json({ success: true, data: created, message: 'Job workflow started.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.startStep = async (req, res) => {
  try {
    const jobCardId = toInt(req.params.jobCardId);
    const stepId = toInt(req.params.stepId);
    const { operatorName, machineId, remarks, inputData } = req.body;

    const job = await getJobWithWorkflow(jobCardId);
    if (!job || !job.workflow) return res.status(404).json({ success: false, message: 'Job workflow not found.' });
    if (job.workflow.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: `Workflow status is ${job.workflow.status}.` });
    }
    if (job.workflow.currentStepId !== stepId) {
      return res.status(400).json({ success: false, message: 'Cannot start a non-current step (no skipping allowed).' });
    }

    const step = await prisma.workflowStep.findUnique({ where: { id: stepId } });
    if (!step) return res.status(404).json({ success: false, message: 'Workflow step not found.' });
    if (step.requiresMachine && !machineId) {
      return res.status(400).json({ success: false, message: 'Machine is mandatory for this step.' });
    }

    const existingRuns = await prisma.jobStepTracking.findMany({
      where: { jobWorkflowId: job.workflow.id, workflowStepId: stepId },
      orderBy: { runNo: 'desc' },
      take: 1,
    });
    let runNo = 1;
    let trackingId = null;
    if (existingRuns.length) {
      const last = existingRuns[0];
      if (last.status === STEP_STATUS.IN_PROGRESS) {
        return res.status(400).json({ success: false, message: 'Step is already in progress.' });
      }
      // Revisited steps in rework loops must create a fresh run.
      // Reuse only pending run; otherwise increment run number.
      runNo = last.status === STEP_STATUS.PENDING ? last.runNo : last.runNo + 1;
      trackingId = last.status === STEP_STATUS.PENDING ? last.id : null;
    }

    let tracking;
    if (trackingId) {
      tracking = await prisma.jobStepTracking.update({
        where: { id: trackingId },
        data: {
          status: STEP_STATUS.IN_PROGRESS,
          startedAt: new Date(),
          operatorName: operatorName || null,
          machineId: machineId ? toInt(machineId) : null,
          remarks: remarks || null,
          inputData: inputData || null,
          executedById: req.user.id,
        },
      });
    } else {
      tracking = await prisma.jobStepTracking.create({
        data: {
          jobWorkflowId: job.workflow.id,
          workflowStepId: stepId,
          runNo,
          status: STEP_STATUS.IN_PROGRESS,
          startedAt: new Date(),
          operatorName: operatorName || null,
          machineId: machineId ? toInt(machineId) : null,
          remarks: remarks || null,
          inputData: inputData || null,
          executedById: req.user.id,
        },
      });
    }

    return res.json({ success: true, data: tracking, message: 'Step started.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.completeStep = async (req, res) => {
  try {
    const jobCardId = toInt(req.params.jobCardId);
    const stepId = toInt(req.params.stepId);
    const { qcResult, observations, remarks, outputData, attachments } = req.body;

    const job = await getJobWithWorkflow(jobCardId);
    if (!job || !job.workflow) return res.status(404).json({ success: false, message: 'Job workflow not found.' });
    if (job.workflow.currentStepId !== stepId) {
      return res.status(400).json({ success: false, message: 'Only current step can be completed.' });
    }

    const step = await prisma.workflowStep.findUnique({ where: { id: stepId } });
    if (!step) return res.status(404).json({ success: false, message: 'Step not found.' });
    if (step.requiresQc && !qcResult) {
      return res.status(400).json({ success: false, message: 'QC result is mandatory for this step.' });
    }

    const tracking = await prisma.jobStepTracking.findFirst({
      where: { jobWorkflowId: job.workflow.id, workflowStepId: stepId, status: STEP_STATUS.IN_PROGRESS },
      orderBy: { runNo: 'desc' },
    });
    if (!tracking) {
      return res.status(400).json({ success: false, message: 'Step is not in progress.' });
    }

    const now = new Date();
    const durationSec = tracking.startedAt ? Math.max(0, Math.floor((now - new Date(tracking.startedAt)) / 1000)) : null;
    const isFinalInspectionFail = step.stepCode === 'FINAL_INSPECTION' && qcResult === 'FAIL';

    await prisma.jobStepTracking.update({
      where: { id: tracking.id },
      data: {
        status: isFinalInspectionFail ? STEP_STATUS.FAILED : STEP_STATUS.COMPLETED,
        endedAt: now,
        durationSec,
        qcResult: qcResult || null,
        observations: observations || null,
        remarks: remarks || tracking.remarks || null,
        outputData: outputData || null,
        attachments: attachments || null,
        executedById: req.user.id,
      },
    });

    if (isFinalInspectionFail) {
      return res.json({
        success: true,
        actionRequired: 'TRIGGER_REWORK',
        message: 'Final inspection failed and step marked FAILED. Trigger rework to continue the flow.',
      });
    }

    const context = {
      qcResult: qcResult || null,
      materialType: job.dieMaterial || job.part?.material || null,
      jobStatus: job.status,
      ...(tracking.inputData || {}),
      ...(outputData || {}),
    };
    const nextTransition = await getNextTransition(job.workflow.templateId, stepId, context);

    if (!nextTransition) {
      const completed = await prisma.jobWorkflow.update({
        where: { id: job.workflow.id },
        data: { status: 'COMPLETED', completedAt: new Date(), currentStepId: null },
      });
      return res.json({ success: true, data: completed, message: 'Step completed. Workflow finished.' });
    }

    const updatedWorkflow = await prisma.$transaction(async (tx) => {
      await tx.jobWorkflow.update({
        where: { id: job.workflow.id },
        data: { currentStepId: nextTransition.toStepId, status: 'IN_PROGRESS' },
      });
      const latestForNext = await tx.jobStepTracking.findFirst({
        where: { jobWorkflowId: job.workflow.id, workflowStepId: nextTransition.toStepId },
        orderBy: { runNo: 'desc' },
      });
      if (!latestForNext || latestForNext.status === STEP_STATUS.COMPLETED) {
        await tx.jobStepTracking.create({
          data: {
            jobWorkflowId: job.workflow.id,
            workflowStepId: nextTransition.toStepId,
            runNo: latestForNext?.runNo ? latestForNext.runNo + 1 : 1,
            status: STEP_STATUS.PENDING,
          },
        });
      }
      return tx.jobWorkflow.findUnique({
        where: { id: job.workflow.id },
        include: { currentStep: true },
      });
    });

    return res.json({
      success: true,
      data: updatedWorkflow,
      message: `Step completed. Moved to ${updatedWorkflow.currentStep?.stepName || 'next step'}.`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.triggerRework = async (req, res) => {
  try {
    const jobCardId = toInt(req.params.jobCardId);
    const { reason, qcResult } = req.body;
    const job = await getJobWithWorkflow(jobCardId);
    if (!job || !job.workflow) return res.status(404).json({ success: false, message: 'Job workflow not found.' });
    if (!job.workflow.currentStepId) return res.status(400).json({ success: false, message: 'No active current step.' });

    const transitions = await prisma.workflowTransition.findMany({
      where: {
        templateId: job.workflow.templateId,
        fromStepId: job.workflow.currentStepId,
        isReworkPath: true,
      },
      orderBy: [{ priority: 'asc' }, { id: 'asc' }],
      include: { toStep: true },
    });
    if (!transitions.length) {
      return res.status(400).json({ success: false, message: 'No rework path configured from current step.' });
    }

    const selected = transitions.find((t) => evaluateTransition(t, { qcResult: qcResult || 'FAIL' })) || transitions[0];
    const now = new Date();

    const wf = await prisma.$transaction(async (tx) => {
      await tx.jobStepTracking.updateMany({
        where: {
          jobWorkflowId: job.workflow.id,
          workflowStepId: job.workflow.currentStepId,
          status: { in: [STEP_STATUS.IN_PROGRESS, STEP_STATUS.FAILED] },
        },
        data: {
          status: STEP_STATUS.FAILED,
          endedAt: now,
          remarks: reason || 'Rework triggered',
          qcResult: 'FAIL',
          executedById: req.user.id,
        },
      });
      await tx.jobWorkflow.update({
        where: { id: job.workflow.id },
        data: {
          currentStepId: selected.toStepId,
          status: 'IN_PROGRESS',
          remarks: reason || job.workflow.remarks,
        },
      });
      const latestForTargetStep = await tx.jobStepTracking.findFirst({
        where: {
          jobWorkflowId: job.workflow.id,
          workflowStepId: selected.toStepId,
        },
        orderBy: { runNo: 'desc' },
      });

      await tx.jobStepTracking.create({
        data: {
          jobWorkflowId: job.workflow.id,
          workflowStepId: selected.toStepId,
          runNo: latestForTargetStep ? latestForTargetStep.runNo + 1 : 1,
          status: STEP_STATUS.PENDING,
          remarks: 'Entered via rework loop',
        },
      });
      return tx.jobWorkflow.findUnique({
        where: { id: job.workflow.id },
        include: { currentStep: true },
      });
    });

    return res.json({
      success: true,
      data: wf,
      message: `Rework loop triggered. Moved to ${wf.currentStep?.stepName || 'rework step'}.`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getTimeline = async (req, res) => {
  try {
    const jobCardId = toInt(req.params.jobCardId);
    const workflow = await prisma.jobWorkflow.findUnique({
      where: { jobCardId },
      include: {
        template: { select: { id: true, code: true, name: true, version: true } },
        currentStep: { select: { id: true, stepCode: true, stepName: true, sequenceNo: true } },
        stepsTracking: {
          include: {
            workflowStep: { select: { id: true, stepCode: true, stepName: true, sequenceNo: true } },
            machine: { select: { id: true, code: true, name: true } },
            executedBy: { select: { id: true, name: true, role: true } },
          },
          orderBy: [{ createdAt: 'asc' }, { runNo: 'asc' }],
        },
      },
    });
    if (!workflow) return res.status(404).json({ success: false, message: 'Job workflow not found.' });
    return res.json({ success: true, data: workflow });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getAllowedActions = async (req, res) => {
  try {
    const jobCardId = toInt(req.params.jobCardId);
    const job = await getJobWithWorkflow(jobCardId);
    if (!job || !job.workflow) return res.status(404).json({ success: false, message: 'Job workflow not found.' });

    const currentStep = job.workflow.currentStep;
    if (!currentStep) {
      return res.json({ success: true, data: { workflowStatus: job.workflow.status, currentStep: null, actions: [] } });
    }

    const inProgress = await prisma.jobStepTracking.findFirst({
      where: {
        jobWorkflowId: job.workflow.id,
        workflowStepId: currentStep.id,
        status: STEP_STATUS.IN_PROGRESS,
      },
      orderBy: { runNo: 'desc' },
    });

    const transitions = await prisma.workflowTransition.findMany({
      where: { templateId: job.workflow.templateId, fromStepId: currentStep.id },
      include: { toStep: { select: { id: true, stepCode: true, stepName: true } } },
      orderBy: [{ priority: 'asc' }, { id: 'asc' }],
    });

    const actions = [];
    if (!inProgress) actions.push('START_STEP');
    if (inProgress) actions.push('COMPLETE_STEP');
    if (transitions.some((t) => t.isReworkPath)) actions.push('TRIGGER_REWORK');
    if (currentStep.requiresQc) actions.push('ADD_QC_RESULT');
    if (currentStep.requiresFile) actions.push('UPLOAD_ATTACHMENT');

    return res.json({
      success: true,
      data: {
        workflowStatus: job.workflow.status,
        currentStep,
        hasInProgressRun: Boolean(inProgress),
        transitions,
        actions,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
