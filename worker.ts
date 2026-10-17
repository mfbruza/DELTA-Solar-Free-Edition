import {authorizeRequest} from "./lib/selfhost-auth";
import * as energy from "./app/api/energy/route";
import * as settings from "./app/api/settings/route";
import * as collector from "./app/api/collector/route";
import * as backup from "./app/api/backup/route";
import * as audit from "./app/api/audit/route";
import {enableCollector,runCollector} from "./lib/collector";
const routes:Record<string,{GET?:(r:Request)=>Promise<Response>;POST?:(r:Request)=>Promise<Response>}>={"/api/energy":energy,"/api/settings":settings,"/api/collector":collector,"/api/backup":backup,"/api/audit":audit};
export default {
 async fetch(request:Request,env:Cloudflare.Env){
  const authenticated=await authorizeRequest(request,env.DASHBOARD_USERNAME,env.DASHBOARD_PASSWORD);
  if(authenticated instanceof Response)return authenticated;
  const path=new URL(request.url).pathname;
  if(path.startsWith("/api/")){
   const route=routes[path];if(!route)return Response.json({error:"Unknown endpoint."},{status:404});
   if(request.method!=="GET"&&request.method!=="POST")return new Response("Method not allowed",{status:405,headers:{Allow:"GET, POST"}});
   if(request.method==="POST"){
    const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return Response.json({error:"Invalid origin."},{status:403});
    if(Number(request.headers.get("content-length")||0)>1048576)return Response.json({error:"Request too large."},{status:413});
   }
   const handler=route[request.method as "GET"|"POST"];if(!handler)return new Response("Method not allowed",{status:405});
   try{return await handler(authenticated);}catch{return Response.json({error:"Service unavailable. Check database setup and retry."},{status:503,headers:{"Cache-Control":"no-store"}});}
  }
  const response=await env.ASSETS.fetch(authenticated);const h=new Headers(response.headers);h.set("Cache-Control","no-store");h.set("X-Content-Type-Options","nosniff");h.set("Referrer-Policy","same-origin");h.set("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'");return new Response(response.body,{status:response.status,headers:h});
 },
 async scheduled(_event:ScheduledController,env:Cloudflare.Env,ctx:ExecutionContext){if(!env.DASHBOARD_USERNAME||!env.DASHBOARD_PASSWORD||!env.CREDENTIAL_ENCRYPTION_KEY)throw new Error("Set required secrets before scheduled recording.");ctx.waitUntil((async()=>{await enableCollector();const r=await runCollector();console.log(JSON.stringify({recorded:r.recorded,reason:"reason" in r?r.reason:undefined}));})());}
};
