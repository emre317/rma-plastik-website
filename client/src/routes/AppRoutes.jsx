import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import LanguageLayout from '../layouts/LanguageLayout';
import RootRedirect from '../components/i18n/RootRedirect';

import Home from '../pages/Home/Home';
import Company from '../pages/Company/Company';
import Products from '../pages/Products/Products';
import ProductDetail from '../pages/ProductDetail/ProductDetail';
import WaterTanks from '../pages/WaterTanks/WaterTanks';
import ProductTables from '../pages/ProductTables/ProductTables';
import ProductModel from '../pages/ProductModel/ProductModel';
import ProductDatasheet from '../pages/ProductDatasheet/ProductDatasheet';
import Compare from '../pages/Compare/Compare';
import TankFinder from '../pages/TankFinder/TankFinder';
import CustomMolding from '../pages/CustomMolding/CustomMolding';
import Industries from '../pages/Industries/Industries';
import IndustryDetail from '../pages/IndustryDetail/IndustryDetail';
import Contact from '../pages/Contact/Contact';
import Faq from '../pages/Faq/Faq';
import Blog from '../pages/Blog/Blog';
import BlogPost from '../pages/BlogPost/BlogPost';
import Videos from '../pages/Videos/Videos';
import NotFound from '../pages/NotFound/NotFound';

// Admin panel is loaded on demand so visitors never download it
const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const ProtectedAdminRoute = lazy(() => import('../components/ProtectedAdminRoute'));
const AdminLogin = lazy(() => import('../pages/AdminLogin/AdminLogin'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard/AdminDashboard'));
const AdminQuotes = lazy(() => import('../pages/AdminQuotes/AdminQuotes'));
const AdminQuoteReports = lazy(() => import('../pages/AdminQuoteReports/AdminQuoteReports'));
const AdminQuoteOffer = lazy(() => import('../pages/AdminQuoteOffer/AdminQuoteOffer'));
const AdminQuoteDetail = lazy(() => import('../pages/AdminQuoteDetail/AdminQuoteDetail'));
const AdminProductFamilies = lazy(() => import('../pages/AdminProductFamilies/AdminProductFamilies'));
const AdminProductFamilyEdit = lazy(() => import('../pages/AdminProductFamilyEdit/AdminProductFamilyEdit'));
const AdminTexts = lazy(() => import('../pages/AdminTexts/AdminTexts'));
const AdminSettings = lazy(() => import('../pages/AdminSettings/AdminSettings'));
const AdminPosts = lazy(() => import('../pages/AdminPosts/AdminPosts'));
const AdminPostEdit = lazy(() => import('../pages/AdminPostEdit/AdminPostEdit'));
const AdminVideos = lazy(() => import('../pages/AdminVideos/AdminVideos'));
const AdminProjects = lazy(() => import('../pages/AdminProjects/AdminProjects'));
const AdminExportMarkets = lazy(() => import('../pages/AdminExportMarkets/AdminExportMarkets'));
const AdminFaqs = lazy(() => import('../pages/AdminFaqs/AdminFaqs'));
const AdminGallery = lazy(() => import('../pages/AdminGallery/AdminGallery'));

export default function AppRoutes() {
  return (
    <Suspense fallback={null}>
    <Routes>

      <Route path="/" element={<RootRedirect />} />

      {/* Public site: /tr/..., /en/..., /ar/... */}
      <Route path="/:lang" element={<LanguageLayout />}>
        <Route index element={<Home />} />
        <Route path="company" element={<Company />} />

        <Route path="products" element={<Products />} />
        <Route path="products/:slug" element={<ProductDetail />} />

        <Route path="water-tanks" element={<WaterTanks />} />
        <Route path="tank-finder" element={<TankFinder />} />
        <Route path="compare" element={<Compare />} />
        <Route path="product-tables" element={<ProductTables />} />
        <Route path="product-tables/:familyId/:modelSlug" element={<ProductModel />} />
        <Route path="product-tables/:familyId/:modelSlug/datasheet" element={<ProductDatasheet />} />
        <Route path="custom-molding" element={<CustomMolding />} />

        <Route path="industries" element={<Industries />} />
        <Route
          path="industries/:slug"
          element={<IndustryDetail />}
        />

        <Route path="contact" element={<Contact />} />
        <Route path="faq" element={<Faq />} />

        <Route path="blog" element={<Blog />} />
        <Route path="blog/:slug" element={<BlogPost />} />
        <Route path="videos" element={<Videos />} />

        <Route path="*" element={<NotFound />} />
      </Route>


      {/* Admin panel (English only, not language-prefixed) */}
      <Route path="/admin/login" element={<AdminLogin />} />

      <Route element={<ProtectedAdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/quotes" element={<AdminQuotes />} />
          <Route path="/admin/quote-reports" element={<AdminQuoteReports />} />
          <Route path="/admin/quotes/:id/offer" element={<AdminQuoteOffer />} />
          <Route
            path="/admin/quotes/:id"
            element={<AdminQuoteDetail />}
          />
          <Route path="/admin/product-families" element={<AdminProductFamilies />} />
          <Route path="/admin/product-families/:id" element={<AdminProductFamilyEdit />} />
          <Route path="/admin/texts" element={<AdminTexts />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/posts" element={<AdminPosts />} />
          <Route path="/admin/posts/:id" element={<AdminPostEdit />} />
          <Route path="/admin/videos" element={<AdminVideos />} />
          <Route path="/admin/projects" element={<AdminProjects />} />
          <Route path="/admin/export-markets" element={<AdminExportMarkets />} />
          <Route path="/admin/faqs" element={<AdminFaqs />} />
          <Route path="/admin/gallery" element={<AdminGallery />} />
        </Route>
      </Route>

    </Routes>
    </Suspense>
  );
}
