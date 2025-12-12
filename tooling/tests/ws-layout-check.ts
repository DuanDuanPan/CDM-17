#!/usr/bin/env tsx
/**
 * Quick WS sanity check:
 * 1) viewer 连接应拒绝写入（收到 error readonly client）
 * 2) editor 写入后 viewer 能收到 layout-sync
 *
 * 运行前：启动 API 服务 (pnpm --filter @cdm/api dev)
 */
import WebSocket from 'ws';

const token = process.env.WS_EDITOR_TOKEN || 'test-token';
const base = 'ws://localhost:4000/ws?graphId=demo-graph';

const waitMessage = (ws: WebSocket, timeout = 2000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeout);
    ws.once('message', (msg) => {
      clearTimeout(timer);
      resolve(msg.toString());
    });
  });

async function main() {
  const viewer = new WebSocket(`${base}&role=viewer`);
  await new Promise((res) => viewer.once('open', res));
  viewer.send(
    JSON.stringify({
      type: 'layout-update',
      actor: 'viewer',
      state: { graphId: 'demo-graph', mode: 'free', version: 1, updatedAt: new Date().toISOString(), updatedBy: 'viewer', payload: {} },
    })
  );
  const viewerResp = await waitMessage(viewer);
  console.log('viewer response:', viewerResp);

  const editor = new WebSocket(`${base}&role=editor&token=${token}`);
  await new Promise((res) => editor.once('open', res));

  const syncPromise = waitMessage(viewer);
  editor.send(
    JSON.stringify({
      type: 'layout-update',
      actor: 'editor',
      state: { graphId: 'demo-graph', mode: 'tree', version: 2, updatedAt: new Date().toISOString(), updatedBy: 'editor', payload: {} },
    })
  );

  const syncMsg = await syncPromise;
  console.log('viewer sync:', syncMsg);

  const graphSyncPromise = waitMessage(viewer);
  editor.send(
    JSON.stringify({
      type: 'graph-update',
      actor: 'editor',
      snapshot: { nodes: [{ id: 'node-x' }], edges: [] },
    })
  );
  const graphSyncMsg = await graphSyncPromise;
  console.log('viewer graph sync:', graphSyncMsg);

  viewer.close();
  editor.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
