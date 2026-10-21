/** Invocation-scoped weighted LRU. Weights bound retained references, not V8 RSS. */
export class BoundedChunkCache<T> {
  private entries = new Map<string, { value: T; weight: number; pins: number }>();
  private flights = new Map<string, { weight: number; users: number; promise: Promise<{ value: T; weight: number; pins: number }> }>();
  private tail: Promise<void> = Promise.resolve();
  private capacityWaiters: (() => void)[] = [];
  readonly stats = { hits: 0, misses: 0, shared: 0, evictions: 0, loads: 0, activeLoads: 0, peakActiveLoads: 0, weight: 0, peakWeight: 0 };

  constructor(readonly maxWeight: number) {
    if (!Number.isSafeInteger(maxWeight) || maxWeight < 1) throw new Error("Invalid cache weight limit");
  }

  private wake() { this.capacityWaiters.splice(0).forEach(resolve => resolve()); }

  private async reserve(weight: number) {
    while (this.stats.weight + weight > this.maxWeight) {
      const unused = [...this.entries].find(([, entry]) => entry.pins === 0);
      if (unused) {
        this.entries.delete(unused[0]);
        this.stats.weight -= unused[1].weight;
        this.stats.evictions++;
      } else await new Promise<void>(resolve => this.capacityWaiters.push(resolve));
    }
    this.stats.weight += weight;
    this.stats.peakWeight = Math.max(this.stats.peakWeight, this.stats.weight);
  }

  async use<R>(key: string, weight: number, load: () => Promise<T>, consume: (value: T) => R | Promise<R>): Promise<R> {
    if (!Number.isSafeInteger(weight) || weight < 1 || weight > this.maxWeight) throw new Error("Chunk exceeds cache admission limit");
    let entry = this.entries.get(key);
    if (entry) {
      if (entry.weight !== weight) throw new Error("Cache identity/weight mismatch");
      this.stats.hits++;
      this.entries.delete(key); this.entries.set(key, entry); entry.pins++;
    } else {
      let flight = this.flights.get(key);
      if (flight) {
        if (flight.weight !== weight) throw new Error("Cache identity/weight mismatch");
        flight.users++; this.stats.shared++;
      }
      else {
        this.stats.misses++;
        const created = { weight, users: 1, promise: undefined! as Promise<{ value: T; weight: number; pins: number }> };
        this.flights.set(key, created);
        created.promise = this.tail.then(async () => {
          await this.reserve(weight);
          this.stats.activeLoads++; this.stats.peakActiveLoads = Math.max(this.stats.peakActiveLoads, this.stats.activeLoads);
          try {
            const value = await load(); this.stats.loads++;
            const loaded = { value, weight, pins: created.users };
            this.entries.set(key, loaded);
            return loaded;
          } catch (error) { this.stats.weight -= weight; this.wake(); throw error; }
          finally { this.stats.activeLoads--; this.flights.delete(key); }
        });
        this.tail = created.promise.then(() => undefined, () => undefined);
        flight = created;
      }
      entry = await flight.promise;
    }
    try { return await consume(entry.value); }
    finally { entry.pins--; this.wake(); }
  }

  clearUnused() {
    for (const [key, entry] of this.entries) if (!entry.pins) { this.entries.delete(key); this.stats.weight -= entry.weight; }
    this.wake();
  }
}
