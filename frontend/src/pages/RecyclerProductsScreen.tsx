import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDealerAuth } from '../context/DealerAuthContext';
import { dealerProductService } from '../services/dealerProductService';
import { DealerHeader } from '../components/layout/DealerHeader';
import { DealerBottomNav } from '../components/layout/DealerBottomNav';
import {
  Package,
  Plus,
  ShoppingBag,
  Coins,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Tag,
  ArrowRight,
  Sparkles,
  Loader2,
  X,
  ExternalLink,
  Trash2,
} from 'lucide-react';

const CATEGORIES = [
  'Furniture',
  'Chairs & Tables',
  'Home & Kitchen',
  'Garden Products',
  'Dustbins',
  'Home Decor',
  'Bags & Accessories',
  'Other Recycled Products',
];

export const RecyclerProductsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { dealer } = useDealerAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [maxRewardCoins, setMaxRewardCoins] = useState('');
  const [stock, setStock] = useState('10');
  const [imageUrl, setImageUrl] = useState('');
  const [specMaterial, setSpecMaterial] = useState('');
  const [specDimensions, setSpecDimensions] = useState('');

  // List of products listed by this recycler
  const [listedProducts, setListedProducts] = useState<any[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    dealerProductService
      .getMyProducts()
      .then((prods) => {
        if (isMounted && Array.isArray(prods)) {
          setListedProducts(prods);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to remove this product listing?')) return;
    try {
      await dealerProductService.deleteProduct(productId);
      setListedProducts((prev) => prev.filter((p) => p.productId !== productId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !discountedPrice || !description.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const origPriceNum = Number(originalPrice) || Number(discountedPrice) * 1.25;
      const discPriceNum = Number(discountedPrice);
      const coinsNum = maxRewardCoins ? Number(maxRewardCoins) : Math.floor(discPriceNum * 0.2);

      const specs: Array<{ key: string; value: string }> = [];
      if (specMaterial.trim()) specs.push({ key: 'Material', value: specMaterial.trim() });
      if (specDimensions.trim()) specs.push({ key: 'Dimensions', value: specDimensions.trim() });

      const finalImage =
        imageUrl.trim() ||
        'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80';

      const created = await dealerProductService.listProduct({
        name: name.trim(),
        category,
        description: description.trim(),
        originalPrice: origPriceNum,
        discountedPrice: discPriceNum,
        maxRewardCoins: coinsNum,
        stock: Number(stock) || 5,
        images: [finalImage],
        specifications: specs,
      });

      setListedProducts((prev) => [created, ...prev]);
      setSuccessMessage(`Product "${name}" successfully listed and live on consumer marketplace!`);
      setIsModalOpen(false);

      // Reset form
      setName('');
      setDescription('');
      setOriginalPrice('');
      setDiscountedPrice('');
      setMaxRewardCoins('');
      setImageUrl('');
      setSpecMaterial('');
      setSpecDimensions('');

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to list product:', err);
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to list product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-24">
      <DealerHeader title="Recycled Store Listings" />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Recycler Seller Info Card */}
        <div className="bg-gradient-to-br from-emerald-800 to-teal-800 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/20 text-emerald-100 text-[10px] font-bold mb-2">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Certified Recycler Partner</span>
              </div>
              <h2 className="text-lg font-black">{dealer?.businessName || 'Recycler Hub'}</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                List upcycled and recycled products for thousands of verified consumers
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white flex-shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-200">
              Auto-sync to Scrapwala consumer store
            </span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 bg-white text-emerald-900 rounded-xl font-black text-xs shadow-md hover:bg-emerald-50 transition flex items-center space-x-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>+ Add Product</span>
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Overview Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              How Product Listing Works
            </h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Instant Approval
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every recycled product you publish automatically appears in the consumer <strong>Recycled Store</strong>. Customers can apply their scrap reward coins for discounts, which Scrapwala settles with you directly.
          </p>
        </div>

        {/* Newly Listed Products in Current Session */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Your Marketplace Products ({listedProducts.length})
            </h3>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Listing</span>
            </button>
          </div>

          {listedProducts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">No products listed in this session</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Click "+ Add Product" to publish recycled tables, planters, dustbins, or crafts directly to consumer buyers.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                + List Recycled Product
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {listedProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between shadow-xs"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <img
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80'}
                      alt={p.name}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-slate-100"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {p.category}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 truncate mt-1">{p.name}</h4>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Price: <strong className="text-emerald-700">₹{p.discountedPrice}</strong> · Stock: {p.stock}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-3 flex items-center space-x-2">
                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Live</span>
                    </span>
                    <button
                      onClick={() => handleDeleteProduct(p.productId)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base text-slate-900">List Recycled Product</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Upcycled Pine Wood Coffee Table"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Product Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain how this item was recycled and its dimensions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1500"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Store Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1100"
                    value={discountedPrice}
                    onChange={(e) => setDiscountedPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Max Reward Coins</label>
                  <input
                    type="number"
                    placeholder="e.g. 150"
                    value={maxRewardCoins}
                    onChange={(e) => setMaxRewardCoins(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Product Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Material Spec</label>
                  <input
                    type="text"
                    placeholder="e.g. 100% Recycled Pine"
                    value={specMaterial}
                    onChange={(e) => setSpecMaterial(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Dimensions</label>
                  <input
                    type="text"
                    placeholder="e.g. 60 x 40 x 45 cm"
                    value={specDimensions}
                    onChange={(e) => setSpecDimensions(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-2xl transition shadow-md flex items-center justify-center space-x-2 active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing to Marketplace...</span>
                    </>
                  ) : (
                    <span>Publish to Consumer Store</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DealerBottomNav />
    </div>
  );
};
