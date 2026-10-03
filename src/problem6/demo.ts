
import http from 'http';
import { createApp } from './src/app';
import { SignatureService } from './src/anti-cheat/signature';
import { WebSocket } from 'ws';

async function main() {
  console.log('=== Problem 6: Live Scoreboard + Anti-Cheat Demo ===\n');
  const server = http.createServer();
  const app = createApp(server);
  server.on('request', app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const addr = server.address() as import('net').AddressInfo;
  const base = `http://127.0.0.1:${addr.port}`;
  console.log(`Ephemeral server on ${base} + ws://127.0.0.1:${addr.port}/ws/leaderboard`);

  // Connect a real WebSocket client BEFORE scoring so we see the push
  const ws = new WebSocket(`ws://127.0.0.1:${addr.port}/ws/leaderboard`);
  const received: string[] = [];
  await new Promise<void>((resolve, reject) => {
    ws.on('open', () => resolve());
    ws.on('error', (e) => reject(e));
  });
  ws.on('message', (m: import('ws').RawData) => {
    received.push(m.toString());
    console.log('  [WS push] ' + m.toString().slice(0, 160));
  });
  console.log('WS client connected, waiting for leaderboard pushes...\n');

  // 1. Register
  console.log('1) POST /api/v1/auth/register');
  interface RegisterResponse { userId: string; token: string; secret: string }
  const reg = (await (await fetch(`${base}/api/v1/auth/register`, { method: 'POST' })).json()) as RegisterResponse;
  console.log(`   -> userId=${String(reg.userId).slice(0, 8)}... token=${String(reg.token).slice(0, 12)}...`);
  const { userId, token, secret } = reg;

  const signed = (actionType: string, nonce: string, timestamp: number) => ({
    actionType, nonce, timestamp,
    signature: SignatureService.signAction(userId, actionType, nonce, timestamp, secret),
  });

  interface ActionBody { actionType: string; nonce: string; timestamp: number; signature: string }
  const execute = async (body: ActionBody) => {
    const res = await fetch(`${base}/api/v1/actions/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    interface ActionResult { success?: boolean; newScore?: number; error?: string }
    return { status: res.status, json: (await res.json()) as ActionResult };
  };

  // 2. Valid action -> triggers WS broadcast
  console.log('2) POST /api/v1/actions/execute (valid task_complete +10)');
  const r1 = await execute(signed('task_complete', 'demo-nonce-1', Date.now()));
  console.log(`   -> ${r1.status} newScore=${r1.json.newScore}`);
  await new Promise((r) => setTimeout(r, 300));

  // 3. Replay same nonce -> rejected
  console.log('3) Replay same nonce (expect 400 Replay detected)');
  const replayBody = signed('task_complete', 'demo-nonce-1', Date.now());
  const r2 = await execute(replayBody);
  console.log(`   -> ${r2.status} error="${r2.json.error}"`);

  // 4. Tampered signature -> rejected
  console.log('4) Tampered signature (expect 400 Invalid signature)');
  const bad = signed('task_complete', 'demo-nonce-2', Date.now());
  bad.signature = 'deadbeef';
  const r3 = await execute(bad);
  console.log(`   -> ${r3.status} error="${r3.json.error}"`);

  // 5. Second valid action (quiz_pass +25) -> another WS push
  console.log('5) Second valid action (quiz_pass +25)');
  const r4 = await execute(signed('quiz_pass', 'demo-nonce-3', Date.now()));
  console.log(`   -> ${r4.status} newScore=${r4.json.newScore}`);
  await new Promise((r) => setTimeout(r, 300));

  // 6. Read leaderboard + rank
  console.log('6) GET /api/v1/leaderboard/top?k=10 + GET /api/v1/users/:id/score');
  interface TopResponse { data: Array<{ member: string; score: number }> }
  const top = (await (await fetch(`${base}/api/v1/leaderboard/top?k=10`)).json()) as TopResponse;
  interface RankResponse { rank: number | null; score: number | null }
  const rank = (await (await fetch(`${base}/api/v1/users/${userId}/score`)).json()) as RankResponse;
  console.log(`   -> top=${JSON.stringify(top.data)} rank=${rank.rank} score=${rank.score}`);
  console.log(`\nWS pushes received: ${received.length} (live broadcast works: ${received.length >= 2 ? 'YES' : 'NO'})`);

  ws.close();
  server.close();
  console.log('\nDone. Run tests: npm test | Start server: npm run dev');
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
