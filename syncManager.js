// syncManager.js
const sqlite3 = require('sqlite3').verbose();
const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

class SQLiteGitSync {
  constructor(localDbPath, repoPath, repoUrl) {
    this.localDbPath = localDbPath;
    this.repoPath = repoPath;
    this.repoUrl = repoUrl;
    this.remoteDbPath = path.join(repoPath, 'shared.db');
  }

  async init() {
    if (!fs.existsSync(this.repoPath)) {
      await simpleGit().clone(this.repoUrl, this.repoPath);
    }
    this.git = simpleGit(this.repoPath);
  }

  async pushChanges() {
    // Копируем локальную базу в репозиторий
    fs.copyFileSync(this.localDbPath, this.remoteDbPath);
    
    await this.git.add('shared.db');
    await this.git.commit(`Update ${new Date().toISOString()}`);
    await this.git.push();
  }

  async pullChanges() {
    await this.git.pull();
    await this.mergeDatabases();
  }

  async mergeDatabases() {
    return new Promise((resolve, reject) => {
      const localDb = new sqlite3.Database(this.localDbPath);
      const remoteDb = new sqlite3.Database(this.remoteDbPath);

      // Простая стратегия слияния - берем все записи из удаленной базы
      remoteDb.all("SELECT * FROM items", [], (err, remoteItems) => {
        if (err) reject(err);

        const stmt = localDb.prepare("INSERT OR REPLACE INTO items (id, name, timestamp) VALUES (?, ?, ?)");
        
        remoteItems.forEach(item => {
          stmt.run([item.id, item.name, item.timestamp]);
        });

        stmt.finalize();
        localDb.close();
        remoteDb.close();
        resolve();
      });
    });
  }

  async sync() {
    await this.init();
    await this.pullChanges();
    await this.pushChanges();
    console.log('Sync completed');
  }
}

module.exports = SQLiteGitSync;
