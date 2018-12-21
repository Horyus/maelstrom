import { IndexedBatchTimes } from './BatchTimes';

export type onPayload<Payload> = (coin: string, batch: IndexedBatchTimes, payload: Payload) => void;
