import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
export async function openLocalDb(file){
 const db=new DatabaseSync(file);db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 db.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
 for(const name of (await readdir('drizzle')).filter(x=>x.endsWith('.sql')).sort()){
  if(db.prepare('SELECT name FROM local_migrations WHERE name=?').get(name))continue;
  const sql=await readFile('drizzle/'+name,'utf8');db.exec('BEGIN');
  try{db.exec(sql);db.prepare('INSERT INTO local_migrations(name) VALUES(?)').run(name);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
 }
 return {
  prepare(sql){return {
   bind(...args){const stmt=db.prepare(sql);return {
    async first(){return stmt.get(...args)||null},
    async all(){return {results:stmt.all(...args)}},
    async run(){return stmt.run(...args)}
   }}
  }}
 };
}
