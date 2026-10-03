import request from 'supertest';
import app from './src/app';

async function main() {
  console.log('=== Problem 5: CRUD Walkthrough (in-process, via supertest) ===\n');

  // 1. CREATE
  console.log('1) POST /resources — create "Gaming Laptop"');
  const created = await request(app).post('/resources').send({
    name: 'Gaming Laptop', description: '16GB RAM, RTX 4070', price: 1499,
  });
  console.log(`   -> ${created.status} id=${created.body.data?.id} price=${created.body.data?.price}`);
  const id: string = created.body.data.id;

  // 2. GET (cache path)
  console.log('2) GET /resources/:id — read (LRU-cached findById)');
  const got = await request(app).get(`/resources/${id}`);
  console.log(`   -> ${got.status} name="${got.body.data?.name}"`);

  // 3. LIST with pagination/filter/sort
  console.log('3) GET /resources?limit=5&sortBy=price&sortOrder=asc&minPrice=100');
  const listed = await request(app).get('/resources?limit=5&sortBy=price&sortOrder=asc&minPrice=100');
  console.log(`   -> ${listed.status} count=${listed.body.data?.length} nextCursor=${listed.body.meta?.nextCursor ?? null}`);

  // 4. PATCH (partial)
  console.log('4) PATCH /resources/:id — partial update { price: 1399 }');
  const patched = await request(app).patch(`/resources/${id}`).send({ price: 1399 });
  console.log(`   -> ${patched.status} price=${patched.body.data?.price} name="${patched.body.data?.name}" (unchanged)`);

  // 5. PUT (full)
  console.log('5) PUT /resources/:id — full replace');
  const put = await request(app).put(`/resources/${id}`).send({
    name: 'Gaming Laptop Pro', description: 'Updated', price: 1599,
  });
  console.log(`   -> ${put.status} name="${put.body.data?.name}" price=${put.body.data?.price}`);

  // 6. Idempotency-Key retry
  console.log('6) POST /resources with Idempotency-Key (retry returns same id)');
  const key = 'demo-key-' + Date.now();
  const r1 = await request(app).post('/resources').set('Idempotency-Key', key).send({ name: 'Idempotent', price: 10 });
  const r2 = await request(app).post('/resources').set('Idempotency-Key', key).send({ name: 'Idempotent', price: 10 });
  console.log(`   -> first=${r1.status} id=${r1.body.data?.id} | retry=${r2.status} id=${r2.body.data?.id} | same=${r1.body.data?.id === r2.body.data?.id}`);
  await request(app).delete(`/resources/${r1.body.data?.id}`);

  // 7. DELETE + verify 404
  console.log('7) DELETE /resources/:id then GET (expect 404)');
  const del = await request(app).delete(`/resources/${id}`);
  const after = await request(app).get(`/resources/${id}`);
  console.log(`   -> DELETE ${del.status}, GET-after ${after.status} (${after.body.error?.code})`);

  console.log('\nDone. Run tests: npm test | Start server: npm run dev');
}

main().catch((e) => { console.error(e); process.exit(1); });
