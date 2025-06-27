
const path = require('path');
const bcrypt = require('bcryptjs');
let Low, JSONFile, db;

async function loadLowdb() {
  if (!Low) {
    const { Low } = await import('lowdb');
    const { JSONFile } = await import('lowdb/node');
    const file = path.join(__dirname, 'users.json');
    const adapter = new JSONFile(file);
    db = new Low(adapter, { users: [] });
  }
  await db.read();
  if (db.data === null || db.data === undefined) {
    db.data = { users: [] };
    await db.write();
  }
}

async function initDB() {
  await loadLowdb();
  await db.read();
  db.data ||= { users: [] };
  await db.write();
}

async function addUser(user, pass, role) {
  await loadLowdb();
  await db.read();
  const passHash = bcrypt.hashSync(pass, 8);
  db.data.users.push({ user, passHash, role });
  await db.write();
}

async function findUser(user) {
  await loadLowdb();
  await db.read();
  return db.data.users.find(u => u.user === user);
}

module.exports = { initDB, addUser, findUser };
