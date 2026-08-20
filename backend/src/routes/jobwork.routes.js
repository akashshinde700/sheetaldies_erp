const router = require('express').Router();
const ctrl   = require('../controllers/jobwork.controller');
const auth   = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const validate = require('../middleware/validate');
const commercialVal = require('../validation/commercial.validator');

router.get   ('/',               auth, ctrl.list);
router.get   ('/issued-by-suggestions', auth, ctrl.issuedBySuggestions);
router.get   ('/material-suggestions', auth, ctrl.materialSuggestions);
router.get   ('/part-name-suggestions', auth, ctrl.partNameSuggestions);
router.get   ('/hrc-suggestions', auth, ctrl.hrcSuggestions);
router.get   ('/register',       auth, ctrl.register);
// Inward numbers contain slashes ("INW/26-27/0002"), which cannot survive a
// path segment — nginx turns %2F back into / and the route stops matching. The
// number goes in the query string instead. The path form stays for challan
// numbers, which have no slashes.
router.get   ('/challan-lookup',     auth, ctrl.getByChallanNo);
router.get   ('/challan/:challanNo', auth, ctrl.getByChallanNo);
router.get   ('/:id',            auth, validate(commercialVal.idParamSchema, 'params'), ctrl.getOne);
router.post  ('/',               auth, requireRole('OPERATOR'), validate(commercialVal.createJobworkSchema), ctrl.create);
router.post  ('/inward',         auth, requireRole('OPERATOR'), validate(commercialVal.createJobworkSchema), ctrl.createInward);
router.post  ('/inward-with-jobcards', auth, requireRole('OPERATOR'), ctrl.createInwardWithJobCards);
router.post  ('/:id/create-jobcards',  auth, requireRole('OPERATOR'), ctrl.createJobCardsForChallan);
router.post  ('/:id/items',      auth, requireRole('OPERATOR'), ctrl.addItem);
router.post  ('/jobcard-from-challan', auth, requireRole('OPERATOR'), ctrl.createJobCardFromChallan);
router.post  ('/jobcard-from-items',   auth, requireRole('OPERATOR'), ctrl.createJobCardFromItems);
router.get   ('/:id/pending-items',    auth, ctrl.getPendingItems);
router.post  ('/jobcards/:id/remove-items', auth, requireRole('OPERATOR'), ctrl.removeItemsFromJobCard);
router.post  ('/runsheet-from-jobcard', auth, requireRole('OPERATOR'), ctrl.createRunSheetFromJobCard);
router.post  ('/inward-to-runsheet', auth, requireRole('OPERATOR'), ctrl.createInwardJobCardRunSheet);
router.put   ('/:id',            auth, requireRole('OPERATOR'), validate(commercialVal.idParamSchema, 'params'), validate(commercialVal.updateJobworkSchema), ctrl.update);
router.patch ('/:id/status',     auth, requireRole('OPERATOR'), validate(commercialVal.idParamSchema, 'params'), ctrl.updateStatus);
router.patch ('/items/:itemId',  auth, requireRole('OPERATOR'), ctrl.updateItem);
router.delete('/items/:itemId',  auth, requireRole('OPERATOR'), ctrl.removeItem);
router.delete('/:id',            auth, requireRole('MANAGER'),  ctrl.deleteJobwork);

module.exports = router;
