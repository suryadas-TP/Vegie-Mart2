const express = require('express');
const router = express.Router();
const multer = require('multer');
const verifyToken = require('../middleware/auth');
const { uploadProductImage, createUser, getUserProfile, getImage, logginAccount, updateProductPrice, addToCart, getUserCart, createPaymentOrder, saveOrder, getLatestOrder, removeFromCart, getUserOrders } = require('../Controller/controller');

// Multer setup
const storage = multer.diskStorage({});
const upload = multer({ storage: storage });

// Upload route
router.post('/', upload.single('image'), uploadProductImage);
router.get('/getImage', getImage)

router.post('/login', logginAccount)
router.post('/user/signup', createUser)

router.post('/cart', verifyToken, addToCart)
router.get('/cart', verifyToken, getUserCart)
router.delete('/cart/:id',verifyToken,removeFromCart)

router.get('/me/:id', getUserProfile)
router.put('/vegetables/:id', updateProductPrice)

router.post('/payment/order', verifyToken, createPaymentOrder)
router.post(`/ordered-products`, verifyToken, saveOrder)
// router.get('/ordered-products',verifyToken,getLatestOrder);
router.get('/ordered-products', verifyToken, getUserOrders);


module.exports = router;
