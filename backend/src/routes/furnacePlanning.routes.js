const router = require('express').Router();
const ctrl = require('../controllers/furnacePlanning.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(auth);

router.get('/day', ctrl.getDay); // ?date=YYYY-MM-DD
router.post('/day', requireRole('ADMIN', 'MANAGER'), ctrl.upsertDay);

router.post('/slots', requireRole('ADMIN', 'MANAGER'), ctrl.createSlot);
router.put('/slots/:id', requireRole('ADMIN', 'MANAGER'), ctrl.updateSlot);
router.delete('/slots/:id', requireRole('ADMIN', 'MANAGER'), ctrl.deleteSlot);

module.exports = router;

