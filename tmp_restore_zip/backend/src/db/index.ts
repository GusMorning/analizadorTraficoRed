import Database from 'better-sqlite3';

const db = new Database('network-lab.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS tests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mode TEXT NOT NULL,
    targetHost TEXT NOT NULL,
    targetPort INTEGER NOT NULL,
    protocol TEXT NOT NULL,
    packetSize INTEGER NOT NULL,
    packetCount INTEGER NOT NULL,
    intervalMs INTEGER NOT NULL,
    networkType TEXT,
    provider TEXT,
    location TEXT,
    device TEXT,
    status TEXT NOT NULL,
    avgLatency REAL,
    maxLatency REAL,
    minLatency REAL,
    jitter REAL,
    throughput REAL,
    packetLoss REAL,
    totalDuration REAL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS packet_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    testId TEXT NOT NULL,
    seq INTEGER NOT NULL,
    sentAt TEXT NOT NULL,
    receivedAt TEXT,
    rtt REAL,
    status TEXT NOT NULL,
    FOREIGN KEY(testId) REFERENCES tests(id) ON DELETE CASCADE
  );
`);

export default db;
