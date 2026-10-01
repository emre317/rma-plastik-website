import { Routes, Route } from 'react-router-dom';

import PublicLayout from '../layouts/PublicLayout';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedAdminRoute from '../components/ProtectedAdminRoute';

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
import NotFound from '../pages/NotFound/NotFound';

import AdminLogin from '../pages/AdminLogin/AdminLogin';
import AdminDashboard from '../pages/AdminDashboard/AdminDashboard';
import AdminQuotes from '../pages/AdminQuotes/AdminQuotes';
import AdminQuoteDetail from '../pages/AdminQuoteDetail/AdminQuoteDetail';

export default function AppRoutes() {
  return (
    <Routes>

      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/company" element={<Company />} />

        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetail />} />

        <Route path="/technologies" element={<Technologies />} />
        <Route
          path="/technologies/:slug"
          element={<TechnologyDetail />}
        />

        <Route path="/industries" element={<Industries />} />
        <Route
          path="/industries/:slug"
          element={<IndustryDetail />}
        />

        <Route path="/engineering" element={<Engineering />} />
        <Route path="/contact" element={<Contact />} />

        <Route path="*" element={<NotFound />} />
      </Route>


      <Route path="/admin/login" element={<AdminLogin />} />


      <Route element={<ProtectedAdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/quotes" element={<AdminQuotes />} />
          <Route
            path="/admin/quotes/:id"
            element={<AdminQuoteDetail />}
          />
        </Route>
      </Route>

    </Routes>
  );
}