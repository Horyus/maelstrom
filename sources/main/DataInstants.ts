import { BatchTimes, IndexedBatchTimes, MissingBatchesReport } from '../types/BatchTimes';
import { getRoundedTime }                                      from '../helpers/getRoundedTime';
import { getBatchTimeRangeExclusive }                          from '../helpers/getBatchTimeRangeExclusive';
import { getBatchTimeRange }                                   from '../helpers/getBatchTimeRange';
import { getBatchTime }                                        from '../helpers/getBatchTime';

interface DataInstantsCoins {
    [key: string]: BatchTimes[];
}

interface DataInstantsPlugins {
    [key: string]: DataInstantsCoins;
}

interface CurrentStore {
    [key: string]: number;
}

export class DataInstants {

    private readonly current: CurrentStore = {};
    private readonly coins: string[] = [];
    private readonly plugins: DataInstantsPlugins = {};

    constructor() {
    }

    public clear(plugin: string, coin: string, time: IndexedBatchTimes[]): void {
        time = time.sort((leftb: IndexedBatchTimes, rightb: IndexedBatchTimes): number =>
            rightb.index - leftb.index);
        for (const batch of time) {
            this.plugins[plugin][coin].splice(batch.index, 1);
        }
    }

    public addPlugin(name: string): void {
        this.plugins[name] = {};
        for (const coin of this.coins) {
            this.plugins[name][coin] = [];
            this.current[name] = getRoundedTime();
        }
    }

    public addCoin(name: string): void {
        this.coins.push(name);
        for (const plugin of Object.keys(this.plugins)) {
            this.plugins[plugin][name] = [];
        }
    }

    public setHoles(plugin: string, coin: string, holes: number[]): void {
        for (const hole of holes) {
            const batch: IndexedBatchTimes = {...getBatchTime(hole), index: 0};
            this.placeBatchTime(plugin, coin, batch);
        }
    }

    public setStart(plugin: string, coin: string, start: number): void {
        this.setCurrent(plugin);
        const range: IndexedBatchTimes[] = getBatchTimeRange(start, this.current[plugin]).map((batch: BatchTimes): IndexedBatchTimes => ({
            ...batch,
            index: 0
        }));
        for (const batch of range) {
            this.placeBatchTime(plugin, coin, batch);
        }
    }

    public getMissingBatches(plugin: string, limit?: number): MissingBatchesReport {
        const ret: MissingBatchesReport = {batches: {}, count: 0};
        for (const coin of this.coins) {
            const amount = this.plugins[plugin][coin].length < Math.floor(limit / this.coins.length) ? this.plugins[plugin][coin].length : Math.floor(limit / this.coins.length);
            ret.batches[coin] = this.plugins[plugin][coin].slice(0, amount).map((batch: BatchTimes, index: number): IndexedBatchTimes => ({
                ...batch,
                index
            }));

            ret.count += amount;
        }
        return ret;
    }

    private placeBatchTime(plugin: string, coin: string, batch: BatchTimes): void {
        let step = 10000;
        let idx = 0;
        while (step > 1) {
            if ((this.plugins[plugin][coin].length > (step + idx))
                && (this.plugins[plugin][coin][step + idx].end < batch.end)) {
                idx += step;
            } else {
                step /= 10;
            }
        }

        while (idx < this.plugins[plugin][coin].length && this.plugins[plugin][coin][idx].end < batch.end) {
            ++idx;
        }

        if (idx === this.plugins[plugin][coin].length) {
            this.plugins[plugin][coin].push(batch);
        } else {
            this.plugins[plugin][coin].splice(idx, 0, batch);
        }

    }

    public setCurrent(plugin: string): void {
        const new_current: number = getRoundedTime();
        if (new_current !== this.current[plugin]) {
            const newBatches: IndexedBatchTimes[] = getBatchTimeRangeExclusive(this.current[plugin], new_current).map((batch: BatchTimes): IndexedBatchTimes => ({
                ...batch,
                index: 0
            }));
            for (const coin of this.coins) {
                for (const batch of newBatches) {
                    this.placeBatchTime(plugin, coin, batch);
                }
            }
            this.current[plugin] = new_current;
        }
    }

}
