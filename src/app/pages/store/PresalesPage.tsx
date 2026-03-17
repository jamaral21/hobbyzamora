import { StoreLayout } from '../../components/layout/StoreLayout';
import { RequireAuth } from '../../components/auth/RequireAuth';
import { ProductListingPageContent } from './ProductListingPage';

export default function PresalesPage() {
  return (
    <StoreLayout>
      <RequireAuth message="Inicia sesión para ver preventas">
        <ProductListingPageContent presalesOnly />
      </RequireAuth>
    </StoreLayout>
  );
}
