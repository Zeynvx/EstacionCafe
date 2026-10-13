const router = require('express').Router();
const controller = require('../controllers/categories.controller');
const { authenticate, allowRoles } = require('../middleware/auth.middleware');
router.get('/', controller.list);
router.post('/', authenticate, allowRoles('Administrador'), controller.create);
router.put('/:id', authenticate, allowRoles('Administrador'), controller.update);
router.delete('/:id', authenticate, allowRoles('Administrador'), controller.remove);
module.exports = router;
