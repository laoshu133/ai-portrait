/**
 * Script to create quota products on Creem.io
 * Run with: node create-creem-products.js
 */

const CREEM_API_KEY = 'creem_73GLJ4pku9X2o3tD2Hrna6';
const BASE_URL = 'https://api.creem.io/v1';

// Products to create
const products = [
  {
    id: 'starter-2',
    name: {
      default: 'Starter Pack (2 Generations)',
      zh: '体验包 (2次生成)'
    },
    description: {
      default: 'Perfect for occasional use - 2 AI portrait generations',
      zh: '适合偶尔需要生成照片，包含 2 次 AI 形象照生成'
    },
    type: 'one-time',
    prices: {
      USD: 1.99,
      CNY: 4.99,
      EUR: 1.79,
      GBP: 1.59,
    },
    active: true,
  },
  {
    id: 'value-5',
    name: {
      default: 'Value Pack (5 Generations)',
      zh: '超值包 (5次生成)'
    },
    description: {
      default: 'Recommended for family use - 5 AI portrait generations, best value',
      zh: '推荐给家庭使用，包含 5 次 AI 形象照生成，性价比最高'
    },
    type: 'one-time',
    prices: {
      USD: 3.99,
      CNY: 9.99,
      EUR: 3.59,
      GBP: 3.19,
    },
    active: true,
  },
  {
    id: 'pro-12',
    name: {
      default: 'Pro Pack (12 Generations)',
      zh: '专业包 (12次生成)'
    },
    description: {
      default: 'For frequent use - 12 AI portrait generations, lowest cost per generation',
      zh: '经常使用，包含 12 次 AI 形象照生成，单次成本最低'
    },
    type: 'one-time',
    prices: {
      USD: 7.99,
      CNY: 19.99,
      EUR: 7.19,
      GBP: 6.49,
    },
    active: true,
  },
];

async function createProduct(product) {
  const url = `${BASE_URL}/products`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CREEM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      store_id: 'sto_4NtKi33TUh2F1fZyPntSS8',
      slug: product.id,
      name: product.name,
      description: product.description,
      type: product.type,
      prices: product.prices,
      active: product.active,
    }),
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create ${product.id}: ${response.status} - ${text}`);
  }
  
  const data = await response.json();
  console.log(`✅ Created product: ${product.id} → ${data.product.id}`);
  return data;
}

async function main() {
  console.log('🚀 Creating products on Creem.io...\n');
  
  for (const product of products) {
    try {
      await createProduct(product);
    } catch (error) {
      console.error(`❌ ${error.message}`);
      // Continue creating other products even if one fails
    }
  }
  
  console.log('\n🎉 All products processed!');
  console.log('\nNext steps:');
  console.log('1. Set your webhook to: https://ai-portrait.aipixbox.com/api/webhooks/creem');
  console.log('2. Copy webhook secret to environment variable CREEM_WEBHOOK_SECRET');
}

main().catch(console.error);
