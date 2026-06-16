import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductListPage } from './pages/products/ProductListPage';
import { ProductFormPage } from './pages/products/ProductFormPage';
import { CategoryListPage } from './pages/categories/CategoryListPage';
import { CategoryFormPage } from './pages/categories/CategoryFormPage';
import { BrandListPage } from './pages/brands/BrandListPage';
import { BrandFormPage } from './pages/brands/BrandFormPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:id" element={<ProductFormPage />} />
          <Route path="categories" element={<CategoryListPage />} />
          <Route path="categories/new" element={<CategoryFormPage />} />
          <Route path="categories/:id" element={<CategoryFormPage />} />
          <Route path="brands" element={<BrandListPage />} />
          <Route path="brands/new" element={<BrandFormPage />} />
          <Route path="brands/:id" element={<BrandFormPage />} />
          <Route path="projects" element={<PlaceholderPage titleKey="nav.projects" />} />
          <Route path="services" element={<PlaceholderPage titleKey="nav.services" />} />
          <Route path="blogs" element={<PlaceholderPage titleKey="nav.blogs" />} />
          <Route path="users" element={<PlaceholderPage titleKey="nav.users" />} />
          <Route path="roles" element={<PlaceholderPage titleKey="nav.roles" />} />
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
