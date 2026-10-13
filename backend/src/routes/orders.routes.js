const router = require('express').Router();
const controller = require('../controllers/orders.controller');
const { authenticate, optionalAuthenticate, allowRoles } = require('../middleware/auth.middleware');
router.get('/', authenticate, controller.list);
router.post('/', optionalAuthenticate, controller.create);
router.patch('/:id/status', authenticate, allowRoles('Administrador', 'Caja', 'Barista / Cocina'), controller.updateStatus);
router.post('/:id/confirm-cash', authenticate, allowRoles('Administrador', 'Caja'), controller.confirmCash);
router.put('/:id', authenticate, allowRoles('Administrador', 'Caja'), controller.update);
module.exports = router;
