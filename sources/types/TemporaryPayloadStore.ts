import { IndexedBatchTimes } from './BatchTimes';

export interface CoinsRemoveList {
    [key: string]: IndexedBatchTimes[];
}

export interface ReadyPayload {
    payload: any;
    coin: string;
    batch: IndexedBatchTimes;
}

export interface TemporaryPayloadStore {
    [key: string]: ReadyPayload[];
}
