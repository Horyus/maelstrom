export interface BatchTimes {
    start: number;
    end: number;
}

export interface IndexedBatchTimes {
    start: number;
    end: number;
    index: number;
}

export interface MissingBatches {
    [key: string]: IndexedBatchTimes[];
}

export interface MissingBatchesReport {
    batches: MissingBatches;
    count: number;
}
