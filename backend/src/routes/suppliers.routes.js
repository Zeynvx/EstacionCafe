const router = require('express').Router();
const controller = require('../controllers/suppliers.controller');
const { authenticate, allowRoles } = require('../middleware/auth.middleware');
router.use(authenticate, allowRoles('Administrador', 'Logistica'));
router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
module.exports = router;
