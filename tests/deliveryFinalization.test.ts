import { describe, expect, it, vi } from "vitest";
import { finalizeDeliveredCount } from "../supabase/functions/watch-rain/deliveryFinalization";

describe("delivery finalization after Push was accepted", () => {
  it("confirms the exact persisted count without retry", async () => {
    const write = vi.fn().mockResolvedValue({ data:[{id:42,delivered_count:2}],error:null });
    const read = vi.fn();
    expect(await finalizeDeliveredCount({notificationId:42,deliveredCount:2,write,read}))
      .toEqual({confirmed:true,attempts:1,reason:null});
    expect(write).toHaveBeenCalledTimes(1);
    expect(read).not.toHaveBeenCalled();
  });
  it("handles a timeout after DB commit via readback, never repeats the update", async () => {
    const write = vi.fn().mockRejectedValue(new Error("timeout"));
    const read = vi.fn().mockResolvedValue({data:{delivered_count:2},error:null});
    expect(await finalizeDeliveredCount({notificationId:42,deliveredCount:2,write,read}))
      .toEqual({confirmed:true,attempts:1,reason:null});
    expect(write).toHaveBeenCalledTimes(1);
  });
  it("retries an idempotent absolute update but never sends a new Push", async () => {
    const write = vi.fn()
      .mockResolvedValueOnce({data:null,error:{message:"network"}})
      .mockResolvedValueOnce({data:[{id:42,delivered_count:1}],error:null});
    const read = vi.fn().mockResolvedValue({data:{delivered_count:0},error:null});
    expect(await finalizeDeliveredCount({notificationId:42,deliveredCount:1,write,read}))
      .toEqual({confirmed:true,attempts:2,reason:null});
    expect(write).toHaveBeenCalledTimes(2);
  });
  it("marks persistent failures unconfirmed instead of inventing a successful history", async () => {
    const write = vi.fn().mockResolvedValue({data:[],error:null});
    const read = vi.fn().mockResolvedValue({data:{delivered_count:0},error:null});
    expect(await finalizeDeliveredCount({notificationId:42,deliveredCount:1,write,read,maxAttempts:2}))
      .toEqual({confirmed:false,attempts:2,reason:"write_not_confirmed"});
    expect(write).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenCalledTimes(2);
  });
  it("rejects pending zero-delivery records and unsafe IDs", async () => {
    const write=vi.fn(),read=vi.fn();
    expect((await finalizeDeliveredCount({notificationId:42,deliveredCount:0,write,read})).confirmed).toBe(false);
    expect((await finalizeDeliveredCount({notificationId:0,deliveredCount:1,write,read})).confirmed).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });
  it("does not trust an update acknowledgement with a wrong id or count", async () => {
    const write=vi.fn().mockResolvedValue({data:[{id:99,delivered_count:1}],error:null});
    const read=vi.fn().mockResolvedValue({data:{delivered_count:1},error:null});
    expect(await finalizeDeliveredCount({notificationId:42,deliveredCount:1,write,read}))
      .toEqual({confirmed:true,attempts:1,reason:null});
    expect(read).toHaveBeenCalledOnce();
  });
});
