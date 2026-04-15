const router = require('express').Router();
const ctrl   = require('../controllers/jobwork.controller');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const validate = require('../middleware/validate');
const commercialVal = require('../validation/commercial.validator');

router.get   ('/',               auth, ctrl.list);
router.get   ('/register',       auth, ctrl.register);
router.get   ('/:id',            auth, validate(commercialVal.idParamSchema, 'params'), ctrl.getOne);
router.get   ('/challan/:challanNo', auth, ctrl.getByChallanNo);
router.post  ('/',               auth, requireRole('OPERATOR'), validate(commercialVal.createJobworkSchema), ctrl.create);
router.post  ('/inward',         auth, requireRole('OPERATOR'), validate(commercialVal.createJobworkSchema), ctrl.createInward);
router.post  ('/jobcard-from-challan', auth, requireRole('OPERATOR'), ctrl.createJobCardFromChallan);
router.post  ('/runsheet-from-jobcard', auth, requireRole('OPERATOR'), ctrl.createRunSheetFromJobCard);
router.post  ('/inward-to-runsheet', auth, requireRole('OPERATOR'), ctrl.createInwardJobCardRunSheet);
router.put   ('/:id',            auth, requireRole('OPERATOR'), validate(commercialVal.idParamSchema, 'params'), validate(commercialVal.updateJobworkSchema), ctrl.update);
router.patch ('/:id/status',     auth, requireRole('OPERATOR'), validate(commercialVal.idParamSchema, 'params'), ctrl.updateStatus);

module.exports = router;
