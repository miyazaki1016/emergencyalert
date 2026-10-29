/** The claim is permanent. Expired target leases never regrant this event/subscription. */
export async function guardedPush(args:{claim:()=>Promise<string|null>;send:()=>Promise<void>;finish:(id:string,state:'ACCEPTED'|'FAILED_TERMINAL'|'UNCERTAIN')=>Promise<void>}){
 const id=await args.claim();if(!id)return 'SKIPPED' as const;
 let state:'ACCEPTED'|'FAILED_TERMINAL'|'UNCERTAIN'='ACCEPTED';let error:unknown;
 try{await args.send();}catch(e){error=e;const code=Number((e as {statusCode?:number})?.statusCode??0);state=code>=400&&code<500&&code!==408&&code!==429?'FAILED_TERMINAL':'UNCERTAIN';}
 // A failed finish leaves the durable CLAIMED intent, never an automatic resend.
 await args.finish(id,state);return {state,error};
}
