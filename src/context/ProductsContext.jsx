import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { DEFAULT_PRODUCTS } from "../constants/products";

export const ProductsContext = createContext({ products: DEFAULT_PRODUCTS, loading: false, refresh: ()=>{} });
export const useProducts = () => useContext(ProductsContext);

export function ProductsProvider({ children }){
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [loading,  setLoading]  = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "products"));
      if (snap.size === 0) {
        setProducts(DEFAULT_PRODUCTS);
      } else {
        const live = snap.docs
          .map(d => ({ ...d.data(), _docId: d.id }))
          .filter(p => p.visible !== false);
        setProducts(live);
      }
    } catch (e) {
      console.warn("Products fetch failed, using defaults:", e);
      setProducts(DEFAULT_PRODUCTS);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  return (
    <ProductsContext.Provider value={{ products, loading, refresh: fetchProducts }}>
      {children}
    </ProductsContext.Provider>
  );
}

