import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from './env.js';

const dbFile = resolve(process.cwd(), env.dbPath);
mkdirSync(dirname(dbFile), { recursive: true });

export const db = new DatabaseSync(dbFile);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY,
  handle     TEXT,
  name       TEXT,
  username   TEXT,
  first_seen INTEGER NOT NULL,
  last_seen  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER,
  handle      TEXT,
  product_id  TEXT NOT NULL,
  player_id   TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  buy         INTEGER NOT NULL,
  markup      INTEGER NOT NULL,
  promo       TEXT,
  method      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  provider_id TEXT,
  fazer_id    TEXT,
  redirect    TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS config (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  json       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`);

export interface OrderRow {
  id: string;
  user_id: number | null;
  handle: string | null;
  product_id: string;
  player_id: string;
  amount: number;
  buy: number;
  markup: number;
  promo: string | null;
  method: string | null;
  status: string;
  provider_id: string | null;
  fazer_id: string | null;
  redirect: string | null;
  created_at: number;
  updated_at: number;
}

export interface UserRow {
  id: number;
  handle: string | null;
  name: string | null;
  username: string | null;
  first_seen: number;
  last_seen: number;
}

export const now = (): number => Math.floor(Date.now() / 1000);

export const upsertUser = db.prepare(`
INSERT INTO users (id, handle, name, username, first_seen, last_seen)
VALUES (@id, @handle, @name, @username, @ts, @ts)
ON CONFLICT(id) DO UPDATE SET handle=@handle, name=@name, username=@username, last_seen=@ts
`);

export const insertOrder = db.prepare(`
INSERT INTO orders (id, user_id, handle, product_id, player_id, amount, buy, markup, promo, method, status, provider_id, fazer_id, redirect, created_at, updated_at)
VALUES (@id, @user_id, @handle, @product_id, @player_id, @amount, @buy, @markup, @promo, @method, @status, @provider_id, @fazer_id, @redirect, @created_at, @updated_at)
`);

export const getOrder = db.prepare(`SELECT * FROM orders WHERE id = ?`);
export const updateOrderStatus = db.prepare(
  `UPDATE orders SET status=@status, fazer_id=COALESCE(@fazer_id, fazer_id), provider_id=COALESCE(@provider_id, provider_id), updated_at=@updated_at WHERE id=@id`,
);
export const listOrdersByUser = db.prepare(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`);
export const listAllOrders = db.prepare(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 500`);

export const getConfigRow = db.prepare(`SELECT json FROM config WHERE id = 1`);
export const setConfigRow = db.prepare(`
INSERT INTO config (id, json, updated_at) VALUES (1, @json, @updated_at)
ON CONFLICT(id) DO UPDATE SET json=@json, updated_at=@updated_at
`);

export const countAllUsers = db.prepare(`SELECT COUNT(*) AS n FROM users`);
export const countBuyers = db.prepare(
  `SELECT COUNT(DISTINCT user_id) AS n FROM orders WHERE status IN ('paid','done') AND user_id IS NOT NULL`,
);
export const allUserIds = db.prepare(`SELECT id FROM users`);
export const buyerUserIds = db.prepare(
  `SELECT DISTINCT user_id AS id FROM orders WHERE status IN ('paid','done') AND user_id IS NOT NULL`,
);
