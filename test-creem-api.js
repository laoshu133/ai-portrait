/**
 * Test Creem API connection
 */

const CREEM_API_KEY = 'creem_test_q3CKbSsnQnQf6GU52ba8b';
const BASE_URL = 'https://api.creem.io/v1';
const STORE_ID = 'sto_4NtKi33TUh2F1fZyPntSS8';

async function testListProducts() {
  const url = `${BASE_URL}/products`;
  
  console.log(`Testing GET ${url}`);
  console.log(`Using API Key: ${CREEM_API_KEY.substring(0, 10)}...`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CREEM_API_KEY}`,
      'X-Creem-Store-ID': STORE_ID,
    },
  });
  
  console.log(`Status: ${response.status} ${response.statusText}`);
  
  const text = await response.text();
  console.log(`Response: ${text}`);
}

testListProducts().catch(console.error);
