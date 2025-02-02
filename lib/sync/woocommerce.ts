import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { PrismaClient } from '@prisma/client';
import { chunk } from 'lodash';

const prisma = new PrismaClient();

const api = new WooCommerceRestApi({
  url: process.env.WOOCOMMERCE_URL!,
  consumerKey: process.env.WOOCOMMERCE_KEY!,
  consumerSecret: process.env.WOOCOMMERCE_SECRET!,
  version: 'wc/v3'
});

export async function syncProducts(full = false) {
  try {
    const syncLog = await prisma.syncLog.create({
      data: {
        type: full ? 'full' : 'manual',
        status: 'started'
      }
    });

    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await api.get('products', {
        per_page: 100,
        page,
        status: 'publish'
      });

      const products = response.data;
      if (products.length === 0) {
        hasMore = false;
        continue;
      }

      // Process products in chunks to avoid memory issues
      const chunks = chunk(products, 10);
      for (const productChunk of chunks) {
        await Promise.all(productChunk.map(async (product: any) => {
          await upsertProduct(product);
        }));
      }

      page++;
    }

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}

async function upsertProduct(wooProduct: any) {
  const productData = {
    wooId: wooProduct.id,
    name: wooProduct.name,
    slug: wooProduct.slug,
    description: wooProduct.description,
    shortDescription: wooProduct.short_description,
    sku: wooProduct.sku,
    price: wooProduct.price,
    regularPrice: wooProduct.regular_price || wooProduct.price,
    salePrice: wooProduct.sale_price || null,
    status: wooProduct.status,
    stockStatus: wooProduct.stock_status,
    stockQuantity: wooProduct.stock_quantity,
    lastSyncedAt: new Date()
  };

  // Upsert the product
  const product = await prisma.product.upsert({
    where: { wooId: wooProduct.id },
    create: productData,
    update: productData
  });

  // Sync categories
  if (wooProduct.categories) {
    await syncProductCategories(product.id, wooProduct.categories);
  }

  // Sync images
  if (wooProduct.images) {
    await syncProductImages(product.id, wooProduct.images);
  }

  // Sync variations
  if (wooProduct.variations && wooProduct.variations.length > 0) {
    await syncProductVariations(product.id, wooProduct.variations);
  }

  // Sync attributes
  if (wooProduct.attributes) {
    await syncProductAttributes(product.id, wooProduct.attributes);
  }
}

async function syncProductCategories(productId: string, categories: any[]) {
  // First ensure all categories exist
  const categoryPromises = categories.map(async (cat) => {
    return prisma.productCategory.upsert({
      where: { wooId: cat.id },
      create: {
        wooId: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description || null
      },
      update: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description || null
      }
    });
  });

  const upsertedCategories = await Promise.all(categoryPromises);

  // Then connect them to the product
  await prisma.product.update({
    where: { id: productId },
    data: {
      categories: {
        set: upsertedCategories.map(cat => ({ id: cat.id }))
      }
    }
  });
}

async function syncProductImages(productId: string, images: any[]) {
  // Delete existing images
  await prisma.productImage.deleteMany({
    where: { productId }
  });

  // Create new images
  await Promise.all(images.map(async (image, index) => {
    await prisma.productImage.create({
      data: {
        wooId: image.id,
        productId,
        src: image.src,
        alt: image.alt || null,
        position: index
      }
    });
  }));
}

async function syncProductVariations(productId: string, variationIds: number[]) {
  for (const variationId of variationIds) {
    try {
      const response = await api.get(`products/${productId}/variations/${variationId}`);
      const variation = response.data;

      await prisma.productVariation.upsert({
        where: { wooId: variation.id },
        create: {
          wooId: variation.id,
          productId,
          sku: variation.sku,
          price: variation.price,
          regularPrice: variation.regular_price || variation.price,
          salePrice: variation.sale_price || null,
          stockStatus: variation.stock_status,
          stockQuantity: variation.stock_quantity,
          attributes: variation.attributes
        },
        update: {
          sku: variation.sku,
          price: variation.price,
          regularPrice: variation.regular_price || variation.price,
          salePrice: variation.sale_price || null,
          stockStatus: variation.stock_status,
          stockQuantity: variation.stock_quantity,
          attributes: variation.attributes
        }
      });
    } catch (error) {
      console.error(`Failed to sync variation ${variationId} for product ${productId}:`, error);
    }
  }
}

async function syncProductAttributes(productId: string, attributes: any[]) {
  // Delete existing attributes
  await prisma.productAttribute.deleteMany({
    where: { productId }
  });

  // Create new attributes
  await Promise.all(attributes.map(async (attr, index) => {
    await prisma.productAttribute.create({
      data: {
        wooId: attr.id,
        productId,
        name: attr.name,
        options: attr.options,
        position: index,
        visible: attr.visible,
        variation: attr.variation
      }
    });
  }));
}

// Webhook handler for real-time updates
export async function handleProductWebhook(data: any, event: string) {
  try {
    switch (event) {
      case 'product.created':
      case 'product.updated':
        await upsertProduct(data);
        break;
      case 'product.deleted':
        await prisma.product.delete({
          where: { wooId: data.id }
        });
        break;
    }
  } catch (error) {
    console.error('Webhook handler failed:', error);
    throw error;
  }
}
