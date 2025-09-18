import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

// Server-only WooCommerce client. Do NOT import this into client components.
const api = new WooCommerceRestApi({
  url: process.env.WC_BASE_URL || process.env.NEXT_PUBLIC_WORDPRESS_URL || "",
  consumerKey: process.env.WC_CONSUMER_KEY as string,
  consumerSecret: process.env.WC_CONSUMER_SECRET as string,
  version: "wc/v3",
});

export type WooAttribute = { id?: number; name: string; option: string };
export type WooVariation = {
  id: number;
  attributes: WooAttribute[];
  price?: string;
  regular_price?: string;
  sale_price?: string | null;
  stock_status?: string;
  manage_stock?: boolean;
  stock_quantity?: number | null;
  image?: { src?: string; alt?: string | null } | null;
};

export async function fetchWooProduct(productId: number) {
  const [productRes, variationsRes] = await Promise.all([
    api.get(`products/${productId}`),
    api.get(`products/${productId}/variations`, { per_page: 100 }),
  ]);

  const product = productRes.data;
  const variations: WooVariation[] = variationsRes.data || [];

  return { product, variations };
}

export async function fetchWooProductBySlug(slug: string) {
  const res = await api.get("products", { slug, per_page: 1 });
  const items = res.data || [];
  if (!items.length) return null;
  const parent = items[0];
  const { variations } = await fetchWooProduct(parent.id);
  return { product: parent, variations };
}
