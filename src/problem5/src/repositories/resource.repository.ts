import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Resource } from '@/models/resource.model';
import { config } from '@/config';

interface ResourceRow {
  id: string;
  name: string;
  description: string;
  price: number;
  created_at: string;
  updated_at: string;
}

export class ResourceRepository {
  private db: DatabaseType;
  private cache: Map<string, { resource: Resource; expiresAt: number }>;
  private readonly CACHE_TTL_MS = 5000;
  private readonly MAX_CACHE_SIZE = 100;

  constructor(dbPath: string = config.databasePath) {
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new Database(dbPath);
    if (dbPath !== ':memory:') {
      this.db.pragma('journal_mode = WAL');
    }

    this.cache = new Map<string, { resource: Resource; expiresAt: number }>();
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        price REAL NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_resources_name ON resources(name);
      CREATE INDEX IF NOT EXISTS idx_resources_price ON resources(price);
      CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at);
    `);
  }

  private mapRow(row: ResourceRow): Resource {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [id, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(id);
      }
    }
  }

  private setCache(resource: Resource): void {
    this.cleanCache();
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(resource.id, {
      resource,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
  }

  private getCache(id: string): Resource | null {
    const entry = this.cache.get(id);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(id);
      return null;
    }

    this.cache.delete(id);
    this.cache.set(id, entry);
    return entry.resource;
  }

  public async create(resource: Resource): Promise<Resource> {
    const stmt = this.db.prepare(`
      INSERT INTO resources (id, name, description, price, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      resource.id,
      resource.name,
      resource.description,
      resource.price,
      resource.createdAt.toISOString(),
      resource.updatedAt.toISOString()
    );

    this.setCache(resource);
    return resource;
  }

  public async findById(id: string): Promise<Resource | null> {
    const cached = this.getCache(id);
    if (cached) return cached;

    const row = this.db.prepare(`
      SELECT id, name, description, price, created_at, updated_at
      FROM resources
      WHERE id = ?
    `).get(id) as ResourceRow | undefined;

    if (!row) return null;

    const resource = this.mapRow(row);
    this.setCache(resource);
    return resource;
  }

  public async update(id: string, resource: Resource): Promise<Resource | null> {
    const stmt = this.db.prepare(`
      UPDATE resources
      SET name = ?, description = ?, price = ?, updated_at = ?
      WHERE id = ?
    `);

    const info = stmt.run(
      resource.name,
      resource.description,
      resource.price,
      resource.updatedAt.toISOString(),
      id
    );

    if (info.changes === 0) {
      return null;
    }

    this.setCache(resource);
    return resource;
  }

  public async delete(id: string): Promise<boolean> {
    this.cache.delete(id);
    const stmt = this.db.prepare('DELETE FROM resources WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }

  public async list(params: {
    name?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy: 'name' | 'price' | 'createdAt';
    sortOrder: 'asc' | 'desc';
    cursor?: string;
    limit: number;
  }): Promise<{ data: Resource[]; nextCursor: string | null }> {
    const columnMap: Record<'name' | 'price' | 'createdAt', string> = {
      name: 'name',
      price: 'price',
      createdAt: 'created_at',
    };

    const sortColumn = columnMap[params.sortBy];
    const isAsc = params.sortOrder === 'asc';
    const sortDir = isAsc ? 'ASC' : 'DESC';

    const conditions: string[] = [];
    const queryParams: (string | number)[] = [];

    if (params.name) {
      conditions.push('LOWER(name) LIKE ?');
      queryParams.push(`%${params.name.toLowerCase()}%`);
    }

    if (params.minPrice !== undefined) {
      conditions.push('price >= ?');
      queryParams.push(params.minPrice);
    }

    if (params.maxPrice !== undefined) {
      conditions.push('price <= ?');
      queryParams.push(params.maxPrice);
    }

    if (params.cursor) {
      const cursorRow = this.db.prepare(`
        SELECT id, name, price, created_at
        FROM resources
        WHERE id = ?
      `).get(params.cursor) as Record<string, unknown> | undefined;

      if (cursorRow) {
        const cursorVal = cursorRow[sortColumn] as string | number;
        if (isAsc) {
          conditions.push(`(${sortColumn} > ? OR (${sortColumn} = ? AND id > ?))`);
        } else {
          conditions.push(`(${sortColumn} < ? OR (${sortColumn} = ? AND id < ?))`);
        }
        queryParams.push(cursorVal, cursorVal, params.cursor);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT id, name, description, price, created_at, updated_at
      FROM resources
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDir}, id ${sortDir}
      LIMIT ?
    `;

    queryParams.push(params.limit + 1);

    const rows = this.db.prepare(sql).all(...queryParams) as ResourceRow[];
    const hasMore = rows.length > params.limit;
    const pageRows = hasMore ? rows.slice(0, params.limit) : rows;
    const nextCursor = hasMore ? pageRows[pageRows.length - 1].id : null;

    return {
      data: pageRows.map((row) => this.mapRow(row)),
      nextCursor,
    };
  }

  public close(): void {
    this.cache.clear();
    this.db.close();
  }
}
