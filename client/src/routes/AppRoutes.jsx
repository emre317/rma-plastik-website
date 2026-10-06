import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import LanguageLayout from '../layouts/LanguageLayout';
import RootRedirect from '../components/i18n/RootRedirect';

import Home from '../pages/Home/Home';
import Company from '../pages/Company/Company';
import Products from '../pages/Products/Products';
import ProductDetail from '../pages/ProductDetail/ProductDetail';
import Technologies from '../pages/Technologies/Technologies';
import TechnologyDetail from '../pages/TechnologyDetail/TechnologyDetail';
import Industries from '../pages/Industries/Industries';
import IndustryDetail from '../pages/IndustryDetail/IndustryDetail';
import Engineering from '../pages/Engineering/Engineering';
import Contact from '../pages/Contact/Contact';
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
const AdminQuoteDetail = lazy(() => import('../pages/AdminQuoteDetail/AdminQuoteDetail'));
const AdminProducts = lazy(() => import('../pages/AdminProducts/AdminProducts'));
const AdminProductEdit = lazy(() => import('../pages/AdminProductEdit/AdminProductEdit'));
const AdminTexts = lazy(() => import('../pages/AdminTexts/AdminTexts'));
const AdminSettings = lazy(() => import('../pages/AdminSettings/AdminSettings'));
const AdminPosts = lazy(() => import('../pages/AdminPosts/AdminPosts'));
const AdminPostEdit = lazy(() => import('../pages/AdminPostEdit/AdminPostEdit'));
const AdminVideos = lazy(() => import('../pages/AdminVideos/AdminVideos'));

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

        <Route path="technologies" element={<Technologies />} />
        <Route
          path="technologies/:slug"
          element={<TechnologyDetail />}
        />

        <Route path="industries" element={<Industries />} />
        <Route
          path="industries/:slug"
          element={<IndustryDetail />}
        />

        <Route path="engineering" element={<Engineering />} />
        <Route path="contact" element={<Contact />} />

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
          <Route
            path="/admin/quotes/:id"
            element={<AdminQuoteDetail />}
          />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/products/:id" element={<AdminProductEdit />} />
          <Route path="/admin/texts" element={<AdminTexts />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/posts" element={<AdminPosts />} />
          <Route path="/admin/posts/:id" element={<AdminPostEdit />} />
          <Route path="/admin/videos" element={<AdminVideos />} />
        </Route>
      </Route>

    </Routes>
    </Suspense>
  );
}
