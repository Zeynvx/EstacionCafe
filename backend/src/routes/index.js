const express = require('express');
const authRoutes = require('./auth.routes');
const categoriesRoutes = require('./categories.routes');
const productsRoutes = require('./products.routes');
const usersRoutes = require('./users.routes');
const ordersRoutes = require('./orders.routes');
const stockRoutes = require('./stock.routes');
const suppliersRoutes = require('./suppliers.routes');
const purchasesRoutes = require('./purchases.routes');

const router = express.Router();
router.use('/auth', authRoutes);
router.use('/categories', categoriesRoutes);
router.use('/products', productsRoutes);
router.use('/users', usersRoutes);
router.use('/orders', ordersRoutes);
router.use('/stock', stockRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/purchases', purchasesRoutes);

module.exports = router;
