import { PermissionFlagsBits } from 'discord.js';
export async function syncTicketAccess(guild,db,type,id,enabled){
 const tickets=db.prepare('SELECT channel_id,opener_id,panel_id FROM tickets WHERE guild_id=?').all(guild.id);let failed=0;
 for(const row of tickets){const ch=await guild.channels.fetch(row.channel_id).catch(()=>null);if(!ch){failed++;continue;}let keep=enabled;
 if(!enabled&&type==='user'&&row.opener_id===id)keep=true;
 if(!enabled&&type==='role'){const p=db.prepare('SELECT config_json FROM panels WHERE id=?').get(row.panel_id);keep=(JSON.parse(p?.config_json??'{}').staffRoleIds??[]).includes(id);}
 try{if(keep)await ch.permissionOverwrites.edit(id,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true,AttachFiles:true,ManageMessages:true});else await ch.permissionOverwrites.delete(id);}catch{failed++;}
 }return{updated:tickets.length-failed,failed};
}
export async function syncGrantAfterToggle(guild,db,type,id,result){return syncTicketAccess(guild,db,type,id,result==='granted'||result==='updated');}
