import ProductList from '@/components/ProductList';

export const dynamic = 'force-static';

export default function ProductsPage() {
  return (
    <div className="container mx-auto px-4 py-8" style={{ marginTop: '50px' }}>
      <div className="max-w-7xl mx-auto">
        <ProductList />
      </div>
    </div>
  );
}
