import express from 'express';

import {
  createProduct,
  deleteProduct,
  getProduct,
  getPublicContent,
  getSettings,
  listProducts,
  listTexts,
  saveTexts,
  updateProduct,
  updateSettings,
} from '../controllers/contentController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';
import { uploadProductImage } from '../middleware/upload.js';
import { getPublishState, startPublish } from '../services/publisher.js';
import { getSiteSettings } from '../models/SiteSettings.js';

/* Public: content snapshot read by the site build */
export const publicContentRouter = express.Router();

publicContentRouter.get('/', getPublicContent);

/* Admin: content management */
export const adminContentRouter = express.Router();

adminContentRouter.use(requireAdmin);

adminContentRouter.get('/products', listProducts);
adminContentRouter.post('/products', createProduct);
adminContentRouter.get('/products/:id', getProduct);
adminContentRouter.put('/products/:id', updateProduct);
adminContentRouter.delete('/products/:id', deleteProduct);

adminContentRouter.post('/uploads/product-image', uploadProductImage);

adminContentRouter.get('/texts', listTexts);
adminContentRouter.put('/texts', saveTexts);

adminContentRouter.get('/settings', getSettings);
adminContentRouter.put('/settings', updateSettings);

adminContentRouter.get('/publish', async (req, res) => {
  const settings = await getSiteSettings();

  res.json({
    success: true,
    data: {
      ...getPublishState(),
      contentChangedAt: settings.contentChangedAt,
      publishedAt: settings.publishedAt,
    },
  });
});

adminContentRouter.post('/publish', (req, res) => {
  const started = startPublish();

  res.status(started ? 202 : 409).json({
    success: started,
    message: started ? 'Yayınlama başladı.' : 'Bir yayınlama zaten sürüyor.',
  });
});
