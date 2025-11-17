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
    latitude REAL,
    longitude REAL,
    device TEXT,
    signalStrength TEXT,
    internetDirection TEXT,
    bandFrequency TEXT,
    distanceDescription TEXT,
    plan TEXT,
    signalSource TEXT,
    interpretationNotes TEXT,
    status TEXT NOT NULL,
    avgLatency REAL,
    maxLatency REAL,
    minLatency REAL,
    jitter REAL,
    throughput REAL,
    packetLoss REAL,
    totalDuration REAL,
    speedtestPing REAL,
    speedtestDownload REAL,
    speedtestUpload REAL,
    speedtestServer TEXT,
    speedtestIsp TEXT,
    speedtestTimestamp TEXT,
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

try {
  db.exec('ALTER TABLE tests ADD COLUMN latitude REAL');
} catch (error) {
  // ignore if column exists
}
try {
  db.exec('ALTER TABLE tests ADD COLUMN longitude REAL');
} catch (error) {
  // ignore if column exists
}

export default db;
