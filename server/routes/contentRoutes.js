import express from 'express';

import {
  getPublicContent,
  getSettings,
  listTexts,
  saveTexts,
  updateSettings,
} from '../controllers/contentController.js';
import {
  createFamily,
  deleteFamily,
  getFamily,
  importDefaultFamilies,
  listFamilies,
  updateFamily,
} from '../controllers/productFamilyController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';
import { uploadPostImage, uploadProductImage, uploadProjectImage } from '../middleware/upload.js';
import {
  createProject,
  deleteProject,
  importDefaultProjects,
  listProjects,
  updateProject,
} from '../controllers/projectController.js';
import {
  createExportMarket,
  deleteExportMarket,
  importDefaultExportMarkets,
  listExportMarkets,
  updateExportMarket,
} from '../controllers/exportMarketController.js';
import {
  createPost,
  createVideo,
  deletePost,
  deleteVideo,
  getPost,
  listPosts,
  listVideos,
  updatePost,
  updateVideo,
} from '../controllers/mediaController.js';
import { getPublishState, startPublish } from '../services/publisher.js';
import { getSiteSettings } from '../models/SiteSettings.js';

/* Public: content snapshot read by the site build */
export const publicContentRouter = express.Router();

publicContentRouter.get('/', getPublicContent);

/* Admin: content management */
export const adminContentRouter = express.Router();

adminContentRouter.use(requireAdmin);

adminContentRouter.get('/product-families', listFamilies);
adminContentRouter.post('/product-families', createFamily);
adminContentRouter.post('/product-families/import-defaults', importDefaultFamilies);
adminContentRouter.get('/product-families/:id', getFamily);
adminContentRouter.put('/product-families/:id', updateFamily);
adminContentRouter.delete('/product-families/:id', deleteFamily);

adminContentRouter.post('/uploads/product-image', uploadProductImage);
adminContentRouter.post('/uploads/post-image', uploadPostImage);
adminContentRouter.post('/uploads/project-image', uploadProjectImage);

adminContentRouter.get('/projects', listProjects);
adminContentRouter.post('/projects', createProject);
adminContentRouter.post('/projects/import-defaults', importDefaultProjects);
adminContentRouter.put('/projects/:id', updateProject);
adminContentRouter.delete('/projects/:id', deleteProject);

adminContentRouter.get('/export-markets', listExportMarkets);
adminContentRouter.post('/export-markets', createExportMarket);
adminContentRouter.post('/export-markets/import-defaults', importDefaultExportMarkets);
adminContentRouter.put('/export-markets/:id', updateExportMarket);
adminContentRouter.delete('/export-markets/:id', deleteExportMarket);

adminContentRouter.get('/posts', listPosts);
adminContentRouter.post('/posts', createPost);
adminContentRouter.get('/posts/:id', getPost);
adminContentRouter.put('/posts/:id', updatePost);
adminContentRouter.delete('/posts/:id', deletePost);

adminContentRouter.get('/videos', listVideos);
adminContentRouter.post('/videos', createVideo);
adminContentRouter.put('/videos/:id', updateVideo);
adminContentRouter.delete('/videos/:id', deleteVideo);

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
