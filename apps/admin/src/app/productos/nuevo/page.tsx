import { createProduct } from './actions';
import { NewProductForm } from './new-product-form';

export const metadata = { title: 'Nuevo producto' };

export default function NuevoProductoPage() {
  return (
    <div className="max-w-xl">
      <a href="/productos" className="text-sm text-carbon-400 hover:text-carbon-700">
        ← Productos
      </a>
      <h1 className="mt-1 font-display text-2xl font-bold text-carbon-900">Nuevo producto</h1>
      <p className="mt-1 text-sm text-carbon-400">
        Solo para modelos que no venían en el archivo de inventario. Con el SKU y el nombre basta
        para crearlo; lo demás se completa enseguida en su ficha.
      </p>

      <div className="mt-6">
        <NewProductForm action={createProduct} />
      </div>
    </div>
  );
}
