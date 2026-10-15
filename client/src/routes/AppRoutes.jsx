import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import LanguageLayout from '../layouts/LanguageLayout';
import RootRedirect from '../components/i18n/RootRedirect';

import { pages } from './publicPages';

const {
  Home,
  Company,
  Products,
  ProductDetail,
  WaterTanks,
  ProductTables,
  ProductModel,
  ProductDatasheet,
  Compare,
  TankFinder,
  CustomMolding,
  Industries,
  IndustryDetail,
  Contact,
  Blog,
  BlogPost,
  Videos,
  NotFound,
} = pages;

// Admin panel is loaded on demand so visitors never download it
const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const ProtectedAdminRoute = lazy(() => import('../components/ProtectedAdminRoute'));
const AdminLogin = lazy(() => import('../pages/AdminLogin/AdminLogin'));
const AdminForgotPassword = lazy(() => import('../pages/AdminForgotPassword/AdminForgotPassword'));
const AdminResetPassword = lazy(() => import('../pages/AdminResetPassword/AdminResetPassword'));
const AdminUsers = lazy(() => import('../pages/AdminUsers/AdminUsers'));
const AdminAudit = lazy(() => import('../pages/AdminAudit/AdminAudit'));
const AdminAccount = lazy(() => import('../pages/AdminAccount/AdminAccount'));
const RequireArea = lazy(() => import('../components/admin/RequireArea'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard/AdminDashboard'));
const AdminQuotes = lazy(() => import('../pages/AdminQuotes/AdminQuotes'));
const AdminQuoteReports = lazy(() => import('../pages/AdminQuoteReports/AdminQuoteReports'));
const AdminLeads = lazy(() => import('../pages/AdminLeads/AdminLeads'));
const AdminQuoteOffer = lazy(() => import('../pages/AdminQuoteOffer/AdminQuoteOffer'));
const AdminQuoteDetail = lazy(() => import('../pages/AdminQuoteDetail/AdminQuoteDetail'));
const AdminCustomer = lazy(() => import('../pages/AdminCustomer/AdminCustomer'));
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

        <Route path="blog" element={<Blog />} />
        <Route path="blog/:slug" element={<BlogPost />} />
        <Route path="videos" element={<Videos />} />

        <Route path="*" element={<NotFound />} />
      </Route>


      {/* Admin panel (English only, not language-prefixed) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
      <Route path="/admin/reset-password" element={<AdminResetPassword />} />

      <Route element={<ProtectedAdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/quotes" element={<RequireArea area="sales"><AdminQuotes /></RequireArea>} />
          <Route path="/admin/quote-reports" element={<RequireArea area="sales"><AdminQuoteReports /></RequireArea>} />
          <Route path="/admin/leads" element={<RequireArea area="sales"><AdminLeads /></RequireArea>} />
          <Route path="/admin/quotes/:id/offer" element={<RequireArea area="sales"><AdminQuoteOffer /></RequireArea>} />
          <Route path="/admin/quotes/:id" element={<RequireArea area="sales"><AdminQuoteDetail /></RequireArea>} />
          <Route path="/admin/customer" element={<RequireArea area="sales"><AdminCustomer /></RequireArea>} />
          <Route path="/admin/product-families" element={<RequireArea area="content"><AdminProductFamilies /></RequireArea>} />
          <Route path="/admin/product-families/:id" element={<RequireArea area="content"><AdminProductFamilyEdit /></RequireArea>} />
          <Route path="/admin/texts" element={<RequireArea area="content"><AdminTexts /></RequireArea>} />
          <Route path="/admin/settings" element={<RequireArea area="settings"><AdminSettings /></RequireArea>} />
          <Route path="/admin/users" element={<RequireArea area="users"><AdminUsers /></RequireArea>} />
          <Route path="/admin/account" element={<AdminAccount />} />
          <Route path="/admin/audit" element={<RequireArea area="audit"><AdminAudit /></RequireArea>} />
          <Route path="/admin/posts" element={<RequireArea area="content"><AdminPosts /></RequireArea>} />
          <Route path="/admin/posts/:id" element={<RequireArea area="content"><AdminPostEdit /></RequireArea>} />
          <Route path="/admin/videos" element={<RequireArea area="content"><AdminVideos /></RequireArea>} />
          <Route path="/admin/projects" element={<RequireArea area="content"><AdminProjects /></RequireArea>} />
          <Route path="/admin/export-markets" element={<RequireArea area="content"><AdminExportMarkets /></RequireArea>} />
          <Route path="/admin/faqs" element={<RequireArea area="content"><AdminFaqs /></RequireArea>} />
          <Route path="/admin/gallery" element={<RequireArea area="content"><AdminGallery /></RequireArea>} />
        </Route>
      </Route>

    </Routes>
    </Suspense>
  );
}
