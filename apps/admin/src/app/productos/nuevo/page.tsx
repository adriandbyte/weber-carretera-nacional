import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { createProduct } from './actions';
import { NewProductForm } from './new-product-form';

export const metadata: Metadata = { title: 'Nuevo producto' };

export default function NuevoProductoPage() {
  return (
    <div className="max-w-xl">
      <PageHeader
        back={{ href: '/productos', label: 'Productos' }}
        title="Nuevo producto"
        description="Solo para modelos que no venían en el archivo de inventario. Con el SKU y el nombre basta para crearlo; lo demás se completa enseguida en su ficha."
      />
      <NewProductForm action={createProduct} />
    </div>
  );
}
