export interface SchedulerInterface {
    start(): Promise<void>
    stop(): void
    runNow(taskId: string): Promise<string>
}
