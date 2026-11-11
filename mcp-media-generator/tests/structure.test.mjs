import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('five MCP tool names present',()=>{const code=read('src/pages/api/mcp.ts');for(const name of ['generate_image','generate_video','merge_videos','get_task','list_media'])assert.match(code,new RegExp(`s\\.tool\\('${name}'`))});
test('secrets excluded from Git',()=>{assert.match(read('.gitignore'),/\.env\*/)});
test('database schema and key ordering present',()=>{const code=read('src/lib/turso.ts');for(const table of ['CREATE TABLE IF NOT EXISTS tasks','CREATE TABLE IF NOT EXISTS api_keys','ORDER BY created_at ASC,id ASC'])assert.ok(code.includes(table))});
test('no provider keys hardcoded in env example',()=>{assert.ok(!/ghp_[A-Za-z0-9]{20}/.test(read('.env.example')))});
test('dashboard exists',()=>assert.ok(existsSync(new URL('../src/app/page.tsx',import.meta.url))));
