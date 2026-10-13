const router = require('express').Router();
const controller = require('../controllers/products.controller');
const { authenticate, allowRoles } = require('../middleware/auth.middleware');
router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', authenticate, allowRoles('Administrador'), controller.create);
router.put('/:id', authenticate, allowRoles('Administrador'), controller.update);
router.delete('/:id', authenticate, allowRoles('Administrador'), controller.remove);
module.exports = router;
