import {sqliteTable,text,integer,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';
export const users=sqliteTable('users',{
 id:integer('id').primaryKey(),login:text('login').notNull(),name:text('name').notNull(),avatar:text('avatar').notNull(),
 joined:integer('joined').notNull(),timezone:text('timezone').notNull().default('UTC'),
 card:text('card'),published:integer('published').notNull().default(0)
},t=>[uniqueIndex('users_login').on(t.login)]);
export const sessions=sqliteTable('sessions',{
 id:text('id').primaryKey(),userId:integer('user_id').notNull().references(()=>users.id),token:text('token').notNull(),expires:integer('expires').notNull()
},t=>[index('sessions_expiry').on(t.expires)]);
export const oauth=sqliteTable('oauth_states',{id:text('id').primaryKey(),verifier:text('verifier').notNull(),expires:integer('expires').notNull()});
export const work=sqliteTable('work_sessions',{
 id:text('id').primaryKey(),userId:integer('user_id').notNull().references(()=>users.id),started:integer('started').notNull(),ended:integer('ended')
},t=>[index('work_user_start').on(t.userId,t.started),uniqueIndex('one_running_timer').on(t.userId).where(sql`${t.ended} IS NULL`)]);
export const reports=sqliteTable('reports',{key:text('key').primaryKey(),value:text('value').notNull(),saved:integer('saved').notNull()});
