/** Recording must never throw into notification delivery. No resend or state mutation. */
export async function bestEffort<T>(action:()=>PromiseLike<{data?:T;error?:unknown}>, onFailure:()=>void):Promise<T|null> {
 try { const result=await action(); if(result.error){onFailure();return null;} return result.data ?? null; }
 catch { onFailure();return null; }
}
