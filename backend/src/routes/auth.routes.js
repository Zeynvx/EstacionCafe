const express = require('express');
const controller = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();
router.post('/bootstrap-admin', controller.bootstrapAdmin);
router.get('/bootstrap-status', controller.bootstrapStatus);
router.post('/register', controller.registerCustomer);
router.post('/login', controller.login);
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);
router.put('/me/profile', authenticate, controller.updateProfile);
router.put('/me/password', authenticate, controller.changePassword);
router.get('/me/orders', authenticate, controller.myOrders);
module.exports = router;
