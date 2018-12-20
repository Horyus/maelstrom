export interface BatchTimes {
    start: number;
    end: number;
}

export interface MissingBatches {
    [key: string]: BatchTimes[];
}

export interface MissingBatchesReport {
    batches: MissingBatches;
    count: number;
}
