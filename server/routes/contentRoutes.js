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
import {
  createGroup,
  createSector,
  deleteGroup,
  deleteSector,
  getSector,
  importDefaultGroups,
  importDefaultSectors,
  listGroups,
  listSectors,
  updateGroup,
  updateSector,
} from '../controllers/catalogueController.js';
import { requireAdmin, requirePermission } from '../middleware/authMiddleware.js';
import {
  uploadGalleryImage, uploadPostImage, uploadProductImage, uploadProjectImage,
} from '../middleware/upload.js';
import { createFaq, deleteFaq, listFaqs, updateFaq } from '../controllers/faqController.js';
import {
  createGalleryPhoto, deleteGalleryPhoto, listGallery, updateGalleryPhoto,
} from '../controllers/galleryController.js';
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
import ProductFamily from '../models/ProductFamily.js';
import ProductGroup from '../models/ProductGroup.js';
import Sector from '../models/Sector.js';
import Post from '../models/Post.js';
import Project from '../models/Project.js';
import Faq from '../models/Faq.js';
import GalleryPhoto from '../models/GalleryPhoto.js';
import ExportMarket from '../models/ExportMarket.js';
import Video from '../models/Video.js';
import { audit } from '../services/audit.js';

/* Public: content snapshot read by the site build */
export const publicContentRouter = express.Router();

publicContentRouter.get('/', getPublicContent);

/* Admin: content management */
export const adminContentRouter = express.Router();

adminContentRouter.use(requireAdmin);

// Every role can read the lists (dashboard counts, proforma seller details);
// changing content needs the content role, site settings the admin role
const content = requirePermission('content');
const settings = requirePermission('settings');

adminContentRouter.get('/product-families', listFamilies);
adminContentRouter.post('/product-families', content, audit({ area: 'content', type: 'family', action: 'Ürün ailesi ekledi' }), createFamily);
adminContentRouter.post('/product-families/import-defaults', content, audit({ area: 'content', type: 'family', action: 'Broşür verilerini içe aktardı', label: () => 'Ürün ailesi' }), importDefaultFamilies);
adminContentRouter.get('/product-families/:id', getFamily);
adminContentRouter.put('/product-families/:id', content, audit({ area: 'content', type: 'family', action: 'Ürün ailesi güncelledi', lookup: ProductFamily }), updateFamily);
adminContentRouter.delete('/product-families/:id', content, audit({ area: 'content', type: 'family', action: 'Ürün ailesi sildi', lookup: ProductFamily }), deleteFamily);

adminContentRouter.get('/product-groups', listGroups);
adminContentRouter.post('/product-groups', content, audit({ area: 'content', type: 'group', action: 'Ürün grubu ekledi' }), createGroup);
adminContentRouter.post('/product-groups/import-defaults', content, audit({ area: 'content', type: 'group', action: 'Broşür verilerini içe aktardı', label: () => 'Ürün grubu' }), importDefaultGroups);
adminContentRouter.put('/product-groups/:id', content, audit({ area: 'content', type: 'group', action: 'Ürün grubu güncelledi', lookup: ProductGroup }), updateGroup);
adminContentRouter.delete('/product-groups/:id', content, audit({ area: 'content', type: 'group', action: 'Ürün grubu sildi', lookup: ProductGroup }), deleteGroup);

adminContentRouter.get('/sectors', listSectors);
adminContentRouter.post('/sectors', content, audit({ area: 'content', type: 'sector', action: 'Sektör ekledi' }), createSector);
adminContentRouter.post('/sectors/import-defaults', content, audit({ area: 'content', type: 'sector', action: 'Broşür verilerini içe aktardı', label: () => 'Sektör' }), importDefaultSectors);
adminContentRouter.get('/sectors/:id', getSector);
adminContentRouter.put('/sectors/:id', content, audit({ area: 'content', type: 'sector', action: 'Sektör güncelledi', lookup: Sector }), updateSector);
adminContentRouter.delete('/sectors/:id', content, audit({ area: 'content', type: 'sector', action: 'Sektör sildi', lookup: Sector }), deleteSector);

adminContentRouter.post('/uploads/product-image', content, uploadProductImage);
adminContentRouter.post('/uploads/post-image', content, uploadPostImage);
adminContentRouter.post('/uploads/project-image', content, uploadProjectImage);
adminContentRouter.post('/uploads/gallery-image', content, uploadGalleryImage);

adminContentRouter.get('/projects', listProjects);
adminContentRouter.post('/projects', content, audit({ area: 'content', type: 'project', action: 'Referans proje ekledi' }), createProject);
adminContentRouter.post('/projects/import-defaults', content, audit({ area: 'content', type: 'project', action: 'Broşür verilerini içe aktardı', label: () => 'Referans proje' }), importDefaultProjects);
adminContentRouter.put('/projects/:id', content, audit({ area: 'content', type: 'project', action: 'Referans proje güncelledi', lookup: Project }), updateProject);
adminContentRouter.delete('/projects/:id', content, audit({ area: 'content', type: 'project', action: 'Referans proje sildi', lookup: Project }), deleteProject);

adminContentRouter.get('/faqs', listFaqs);
adminContentRouter.post('/faqs', content, audit({ area: 'content', type: 'faq', action: 'Soru ekledi' }), createFaq);
adminContentRouter.put('/faqs/:id', content, audit({ area: 'content', type: 'faq', action: 'Soru güncelledi', lookup: Faq }), updateFaq);
adminContentRouter.delete('/faqs/:id', content, audit({ area: 'content', type: 'faq', action: 'Soru sildi', lookup: Faq }), deleteFaq);

adminContentRouter.get('/gallery', listGallery);
adminContentRouter.post('/gallery', content, audit({ area: 'content', type: 'gallery', action: 'Saha fotoğrafı ekledi' }), createGalleryPhoto);
adminContentRouter.put('/gallery/:id', content, audit({ area: 'content', type: 'gallery', action: 'Saha fotoğrafı güncelledi', lookup: GalleryPhoto }), updateGalleryPhoto);
adminContentRouter.delete('/gallery/:id', content, audit({ area: 'content', type: 'gallery', action: 'Saha fotoğrafı sildi', lookup: GalleryPhoto }), deleteGalleryPhoto);

adminContentRouter.get('/export-markets', listExportMarkets);
adminContentRouter.post('/export-markets', content, audit({ area: 'content', type: 'market', action: 'İhracat pazarı ekledi' }), createExportMarket);
adminContentRouter.post('/export-markets/import-defaults', content, audit({ area: 'content', type: 'market', action: 'Broşür verilerini içe aktardı', label: () => 'İhracat pazarı' }), importDefaultExportMarkets);
adminContentRouter.put('/export-markets/:id', content, audit({ area: 'content', type: 'market', action: 'İhracat pazarı güncelledi', lookup: ExportMarket }), updateExportMarket);
adminContentRouter.delete('/export-markets/:id', content, audit({ area: 'content', type: 'market', action: 'İhracat pazarı sildi', lookup: ExportMarket }), deleteExportMarket);

adminContentRouter.get('/posts', listPosts);
adminContentRouter.post('/posts', content, audit({ area: 'content', type: 'post', action: 'Blog yazısı ekledi' }), createPost);
adminContentRouter.get('/posts/:id', getPost);
adminContentRouter.put('/posts/:id', content, audit({ area: 'content', type: 'post', action: 'Blog yazısı güncelledi', lookup: Post }), updatePost);
adminContentRouter.delete('/posts/:id', content, audit({ area: 'content', type: 'post', action: 'Blog yazısı sildi', lookup: Post }), deletePost);

adminContentRouter.get('/videos', listVideos);
adminContentRouter.post('/videos', content, audit({ area: 'content', type: 'video', action: 'Video ekledi' }), createVideo);
adminContentRouter.put('/videos/:id', content, audit({ area: 'content', type: 'video', action: 'Video güncelledi', lookup: Video }), updateVideo);
adminContentRouter.delete('/videos/:id', content, audit({ area: 'content', type: 'video', action: 'Video sildi', lookup: Video }), deleteVideo);

adminContentRouter.get('/texts', listTexts);
adminContentRouter.put('/texts', content, audit({ area: 'content', type: 'texts', action: 'Sayfa metinlerini kaydetti', details: (req) => `${Array.isArray(req.body?.items) ? req.body.items.length : 0} metin` }), saveTexts);

adminContentRouter.get('/settings', getSettings);
adminContentRouter.put('/settings', settings, audit({ area: 'settings', type: 'settings', action: 'Site ayarlarını güncelledi', label: () => 'Site Ayarları' }), updateSettings);

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

adminContentRouter.post('/publish', content, audit({ area: 'content', type: 'site', action: 'Siteyi yayınladı', label: () => 'Web sitesi' }), (req, res) => {
  const started = startPublish();

  res.status(started ? 202 : 409).json({
    success: started,
    message: started ? 'Yayınlama başladı.' : 'Bir yayınlama zaten sürüyor.',
  });
});
