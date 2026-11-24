export const BOT_OWNER_ID='1191814686644117537';
export const ACCESS_LEVELS=Object.freeze({mod:1,smod:2,tmod:3});
export const ADMIN_COMMANDS=new Set(['sentpanel','announce','closetopic','opentopic','addlanguage','removelanguage','grantrole','revokerole','mod','smod','tmod']);
export const isOwner=id=>id===BOT_OWNER_ID;
export function getAccessLevel(db,guildId,userId,roles){
 if(isOwner(userId))return 3;if(!guildId)return 0;
 let level=Number(db.prepare('SELECT access_level FROM authorized_admin_users WHERE guild_id=? AND user_id=?').get(guildId,userId)?.access_level)||0;
 const ids=roles?[...roles.keys()]:[];if(ids.length){const qs=ids.map(()=>'?').join(',');for(const x of db.prepare(`SELECT access_level FROM authorized_admin_roles WHERE guild_id=? AND role_id IN (${qs})`).all(guildId,...ids))level=Math.max(level,Number(x.access_level)||0);}
 return level;
}
export const hasAccessLevel=(db,i,n)=>Boolean(i.guildId)&&getAccessLevel(db,i.guildId,i.user.id,i.member?.roles?.cache)>=n;
export const isAuthorizedForAdmin=(i,db)=>hasAccessLevel(db,i,2);
export function hasTicketModerationAccess(db,guildId,member,panel){
 return Boolean(member)&&(member.permissions?.has?.('ManageChannels')||(panel?.config?.staffRoleIds??[]).some(id=>member.roles?.cache?.has(id))||getAccessLevel(db,guildId,member.id,member.roles?.cache)>=1);
}
export function getTicketAccessTargets(db,guildId){
 return {roles:db.prepare('SELECT role_id FROM authorized_admin_roles WHERE guild_id=?').all(guildId).map(x=>x.role_id),users:db.prepare('SELECT user_id FROM authorized_admin_users WHERE guild_id=?').all(guildId).map(x=>x.user_id)};
}
export function getStoredGrantLevel(db,guildId,type,id){const table=type==='role'?'authorized_admin_roles':'authorized_admin_users',key=type==='role'?'role_id':'user_id';return Number(db.prepare(`SELECT access_level FROM ${table} WHERE guild_id=? AND ${key}=?`).get(guildId,id)?.access_level)||0;}
export function grantAccess(db,guildId,type,id,level,by){
 const table=type==='role'?'authorized_admin_roles':'authorized_admin_users',key=type==='role'?'role_id':'user_id',row=db.prepare(`SELECT access_level FROM ${table} WHERE guild_id=? AND ${key}=?`).get(guildId,id);
 if(row&&Number(row.access_level)===3&&by!==BOT_OWNER_ID&&level!==3)return'protected';
 if(row&&Number(row.access_level)===level){db.prepare(`DELETE FROM ${table} WHERE guild_id=? AND ${key}=?`).run(guildId,id);return'removed';}
 db.prepare(`INSERT INTO ${table}(guild_id,${key},access_level,granted_by) VALUES(?,?,?,?) ON CONFLICT(guild_id,${key}) DO UPDATE SET access_level=excluded.access_level,granted_by=excluded.granted_by,created_at=CURRENT_TIMESTAMP`).run(guildId,id,level,by);
 return row?'updated':'granted';
}
export function revokeAccess(db,guildId,type,id){const table=type==='role'?'authorized_admin_roles':'authorized_admin_users',key=type==='role'?'role_id':'user_id';return db.prepare(`DELETE FROM ${table} WHERE guild_id=? AND ${key}=?`).run(guildId,id).changes>0;}
