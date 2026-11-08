export function productionRaw(mail: {subject:string;body:string}) {
  return Buffer.from(
    "From: miyazaki1016@gmail.com\r\nTo: getter01@jaspic-nes.net\r\n"+
    "Subject: =?UTF-8?B?"+Buffer.from(mail.subject.trimStart()).toString("base64")+"?=\r\n"+
    "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"+
    Buffer.from(mail.body).toString("base64").match(/.{1,76}/g)!.join("\r\n")+"\r\n"
  ).toString("base64url");
}

export async function sendProductionMail(accessToken:string, mail:{subject:string;body:string}, request:typeof fetch=fetch):Promise<{status:"SENT"|"FAILED"|"UNKNOWN";message:string|null;error:string|null}> {
  try {
    const response=await request("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{
      method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},
      body:JSON.stringify({raw:productionRaw(mail)}),redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10_000),
    });
    if (!response.ok) return {status:response.status>=400&&response.status<500?"FAILED":"UNKNOWN",message:null,error:`GMAIL_HTTP_${response.status}`};
    const data:unknown=await response.json();
    if (!data||typeof data!=="object"||!("id" in data)||typeof data.id!=="string"||!/^[a-zA-Z0-9_-]+$/.test(data.id)) return {status:"UNKNOWN",message:null,error:"GMAIL_RESPONSE_INVALID"};
    return {status:"SENT",message:data.id,error:null};
  } catch {return {status:"UNKNOWN",message:null,error:"GMAIL_RESULT_UNCERTAIN"};}
}
