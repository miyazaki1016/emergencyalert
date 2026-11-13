import {describe,it,expect,vi} from "vitest";
import {isolatedTestRaw,sendIsolatedTestMail} from "./isolated-gmail-238";

const mail={subject:"試験件名",body:"隔離テストです"};
const decoded=()=>Buffer.from(isolatedTestRaw(mail),"base64url").toString("utf8");

describe("Issue 238 isolated Gmail safety",()=>{
  it("uses only test recipient, not production recipient",()=>{
    expect(decoded()).toContain("To: kishibojim@gmail.com\r\n");
    expect(decoded()).not.toContain("getter01@jaspic-nes.net");
    expect(decoded()).toContain(Buffer.from("[JASPIC 隔離試験] 試験件名").toString("base64"));
  });
  it("rejects header injection",()=>{
    expect(()=>isolatedTestRaw({subject:"x\r\nBcc: attacker@example.com",body:"test"})).toThrow();
  });
  it("accepts Gmail ID from injected fake transport",async()=>{
    const mock=vi.fn(async (_url:string,init?:RequestInit)=>{
      const payload=JSON.parse(String(init?.body));
      const mime=Buffer.from(payload.raw,"base64url").toString("utf8");
      expect(mime).toContain("To: kishibojim@gmail.com\r\n");
      return new Response(JSON.stringify({id:"gmail_test_238"}),{status:200});
    });
    expect(await sendIsolatedTestMail("fake-token",mail,mock as typeof fetch)).toEqual({
      status:"SENT",message:"gmail_test_238",error:null
    });
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it("marks timeout and HTTP 5xx as UNKNOWN, never auto-retries",async()=>{
    const failed=vi.fn(async()=>{throw new Error("network timeout")});
    expect((await sendIsolatedTestMail("fake-token",mail,failed as typeof fetch)).status).toBe("UNKNOWN");
    expect(failed).toHaveBeenCalledTimes(1);
    const unavailable=vi.fn(async()=>new Response("",{status:503}));
    expect((await sendIsolatedTestMail("fake-token",mail,unavailable as typeof fetch)).status).toBe("UNKNOWN");
    expect(unavailable).toHaveBeenCalledTimes(1);
  });
  it("marks HTTP 4xx as FAILED and missing Gmail ID as UNKNOWN",async()=>{
    expect((await sendIsolatedTestMail("fake-token",mail,async()=>new Response("",{status:403}))).status).toBe("FAILED");
    expect((await sendIsolatedTestMail("fake-token",mail,async()=>new Response("{}",{status:200}))).status).toBe("UNKNOWN");
  });
});
