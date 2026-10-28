const express = require('express');
const multer = require('multer');
const fs = require('fs');
const router = express.Router();
const {
	getProfile,
	updateProfile,
	getUserAddresses,
	addUserAddress,
	updateUserAddress,
	deleteUserAddress,
	getCategories,
	getSubcategories,
	getDistrictPricing,
	lookupServicePrice,
	getPricingLocations,
	getProfessionals,
	getCategoryReviews,
	createRequest,
	getMyRequests,
	streamNotifications,
	confirmPayment,
	cancelRequest,
	createReview,
	getNotifications,
	markNotificationRead,
	syncPhoneNotifications,
	getPhoneNotifications,
	deletePhoneNotifications
} = require('../controllers/userController');
const { protectCustomer } = require('../middleware/authMiddleware');

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
const upload = multer({
	storage: multer.diskStorage({
		destination: 'uploads/',
		filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
	}),
	limits: { fileSize: 50 * 1024 * 1024 }
});

router.get('/categories', getCategories);
router.get('/subcategories', getSubcategories);
router.get('/district-pricing', getDistrictPricing);
router.get('/pricing/lookup', lookupServicePrice);
router.get('/pricing/locations', getPricingLocations);
router.get('/professionals', getProfessionals);
router.get('/reviews', getCategoryReviews);
router.get('/profile', protectCustomer, getProfile);
router.patch('/profile', protectCustomer, upload.single('profile_photo'), updateProfile);
router.get('/addresses', protectCustomer, getUserAddresses);
router.post('/addresses', protectCustomer, addUserAddress);
router.patch('/addresses/:id', protectCustomer, updateUserAddress);
router.delete('/addresses/:id', protectCustomer, deleteUserAddress);
router.post('/requests', protectCustomer, upload.fields([
	{ name: 'photos', maxCount: 5 },
	{ name: 'video', maxCount: 1 },
	{ name: 'voice', maxCount: 1 }
]), createRequest);
router.get('/requests', protectCustomer, getMyRequests);
router.post('/requests/:id/cancel', protectCustomer, cancelRequest);
router.post('/requests/:id/confirm-payment', protectCustomer, confirmPayment);
router.post('/requests/:id/review', protectCustomer, createReview);
router.get('/notifications', protectCustomer, getNotifications);
router.patch('/notifications/:id/read', protectCustomer, markNotificationRead);
router.get('/notifications/stream', protectCustomer, streamNotifications);

// Phone-wide notification sync routes
router.post('/phone-notifications', protectCustomer, syncPhoneNotifications);
router.get('/phone-notifications', protectCustomer, getPhoneNotifications);
router.delete('/phone-notifications', protectCustomer, deletePhoneNotifications);

module.exports = router;
