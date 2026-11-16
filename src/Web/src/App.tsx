import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AdminPage } from './pages/AdminPage';
import { BookDetailsPage } from './pages/BookDetailsPage';
import { BookSlotPage } from './pages/BookSlotPage';
import { CancelPage } from './pages/CancelPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ServicesPage } from './pages/ServicesPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ServicesPage />} />
          <Route path="book/:serviceId" element={<BookSlotPage />} />
          <Route path="book/:serviceId/details" element={<BookDetailsPage />} />
          <Route path="cancel/:id" element={<CancelPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
