/**
 * Database Handler - 6 Tools
 * データベース操作ツール（PostgreSQL/MySQL対応）
 */

import { execSync } from 'child_process';

const exec = (cmd, options = {}) => {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
      ...options
    }).trim();
  } catch (e) {
    return { error: e.message };
  }
};

// DB接続文字列パーサー
const parseConnectionString = (connStr) => {
  // postgresql://user:pass@host:port/dbname
  // mysql://user:pass@host:port/dbname
  const match = connStr.match(/^(postgresql|mysql):\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
  if (match) {
    return {
      type: match[1],
      user: match[2],
      password: match[3],
      host: match[4],
      port: match[5],
      database: match[6]
    };
  }
  return null;
};

export const databaseTools = {
  db_connect: {
    description: 'データベース接続テスト',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: { type: 'string', description: 'DB接続文字列' }
      },
      required: ['connectionString']
    },
    handler: async ({ connectionString }) => {
      const conn = parseConnectionString(connectionString);
      if (!conn) {
        return { error: 'Invalid connection string format' };
      }

      if (conn.type === 'postgresql') {
        const result = exec(`PGPASSWORD="${conn.password}" psql -h ${conn.host} -p ${conn.port} -U ${conn.user} -d ${conn.database} -c "SELECT 1"`, { timeout: 10000 });
        return result.error ? result : { status: 'connected', type: 'postgresql' };
      } else if (conn.type === 'mysql') {
        const result = exec(`mysql -h ${conn.host} -P ${conn.port} -u ${conn.user} -p${conn.password} ${conn.database} -e "SELECT 1"`, { timeout: 10000 });
        return result.error ? result : { status: 'connected', type: 'mysql' };
      }

      return { error: 'Unsupported database type' };
    }
  },

  db_tables: {
    description: 'テーブル一覧を取得',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: { type: 'string' }
      },
      required: ['connectionString']
    },
    handler: async ({ connectionString }) => {
      const conn = parseConnectionString(connectionString);
      if (!conn) return { error: 'Invalid connection string' };

      if (conn.type === 'postgresql') {
        return exec(`PGPASSWORD="${conn.password}" psql -h ${conn.host} -p ${conn.port} -U ${conn.user} -d ${conn.database} -c "\\dt"`);
      } else if (conn.type === 'mysql') {
        return exec(`mysql -h ${conn.host} -P ${conn.port} -u ${conn.user} -p${conn.password} ${conn.database} -e "SHOW TABLES"`);
      }

      return { error: 'Unsupported database type' };
    }
  },

  db_schema: {
    description: 'テーブルスキーマを取得',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: { type: 'string' },
        table: { type: 'string', description: 'テーブル名' }
      },
      required: ['connectionString', 'table']
    },
    handler: async ({ connectionString, table }) => {
      const conn = parseConnectionString(connectionString);
      if (!conn) return { error: 'Invalid connection string' };

      if (conn.type === 'postgresql') {
        return exec(`PGPASSWORD="${conn.password}" psql -h ${conn.host} -p ${conn.port} -U ${conn.user} -d ${conn.database} -c "\\d ${table}"`);
      } else if (conn.type === 'mysql') {
        return exec(`mysql -h ${conn.host} -P ${conn.port} -u ${conn.user} -p${conn.password} ${conn.database} -e "DESCRIBE ${table}"`);
      }

      return { error: 'Unsupported database type' };
    }
  },

  db_query: {
    description: 'SELECTクエリを実行（読み取り専用）',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: { type: 'string' },
        query: { type: 'string', description: 'SELECTクエリ' },
        limit: { type: 'number', default: 100 }
      },
      required: ['connectionString', 'query']
    },
    handler: async ({ connectionString, query, limit = 100 }) => {
      // セキュリティ: SELECTのみ許可
      const normalizedQuery = query.trim().toUpperCase();
      if (!normalizedQuery.startsWith('SELECT')) {
        return { error: 'Only SELECT queries are allowed' };
      }

      const conn = parseConnectionString(connectionString);
      if (!conn) return { error: 'Invalid connection string' };

      // LIMIT追加
      const limitedQuery = query.includes('LIMIT') ? query : `${query} LIMIT ${limit}`;

      if (conn.type === 'postgresql') {
        return exec(`PGPASSWORD="${conn.password}" psql -h ${conn.host} -p ${conn.port} -U ${conn.user} -d ${conn.database} -c "${limitedQuery}"`);
      } else if (conn.type === 'mysql') {
        return exec(`mysql -h ${conn.host} -P ${conn.port} -u ${conn.user} -p${conn.password} ${conn.database} -e "${limitedQuery}"`);
      }

      return { error: 'Unsupported database type' };
    }
  },

  db_explain: {
    description: 'クエリ実行計画を取得',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: { type: 'string' },
        query: { type: 'string' }
      },
      required: ['connectionString', 'query']
    },
    handler: async ({ connectionString, query }) => {
      const conn = parseConnectionString(connectionString);
      if (!conn) return { error: 'Invalid connection string' };

      if (conn.type === 'postgresql') {
        return exec(`PGPASSWORD="${conn.password}" psql -h ${conn.host} -p ${conn.port} -U ${conn.user} -d ${conn.database} -c "EXPLAIN ANALYZE ${query}"`);
      } else if (conn.type === 'mysql') {
        return exec(`mysql -h ${conn.host} -P ${conn.port} -u ${conn.user} -p${conn.password} ${conn.database} -e "EXPLAIN ${query}"`);
      }

      return { error: 'Unsupported database type' };
    }
  },

  db_health: {
    description: 'データベース健全性チェック',
    inputSchema: {
      type: 'object',
      properties: {
        connectionString: { type: 'string' }
      },
      required: ['connectionString']
    },
    handler: async ({ connectionString }) => {
      const conn = parseConnectionString(connectionString);
      if (!conn) return { error: 'Invalid connection string' };

      const health = {
        status: 'unknown',
        connection: false,
        latency: null,
        info: {}
      };

      const start = Date.now();

      if (conn.type === 'postgresql') {
        const result = exec(`PGPASSWORD="${conn.password}" psql -h ${conn.host} -p ${conn.port} -U ${conn.user} -d ${conn.database} -c "SELECT version(), pg_database_size('${conn.database}')"`, { timeout: 10000 });
        if (!result.error) {
          health.connection = true;
          health.status = 'healthy';
          health.latency = Date.now() - start;
          health.info = { version: result };
        }
      } else if (conn.type === 'mysql') {
        const result = exec(`mysql -h ${conn.host} -P ${conn.port} -u ${conn.user} -p${conn.password} ${conn.database} -e "SELECT VERSION()"`, { timeout: 10000 });
        if (!result.error) {
          health.connection = true;
          health.status = 'healthy';
          health.latency = Date.now() - start;
          health.info = { version: result };
        }
      }

      return health;
    }
  }
};

export default databaseTools;
