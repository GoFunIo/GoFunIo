import { Logger } from '@nestjs/common';
import { VehicleDeadlineReconciliation } from './vehicle-deadline-reconciliation';
import { NodeEnv } from '../config/env.validation';

describe('VehicleDeadlineReconciliation', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does not schedule cycles in the test environment', async () => {
    const processor = new VehicleDeadlineReconciliation(
      { run: jest.fn() } as never,
      { get: () => NodeEnv.Test } as never,
    );
    const interval = jest.spyOn(global, 'setInterval');
    await processor.onApplicationBootstrap();
    expect(interval).not.toHaveBeenCalled();
  });

  it('coalesces overlapping public cycles in one process', async () => {
    let release!: () => void;
    const run = jest.fn(
      () => new Promise<void>((resolve) => (release = resolve)),
    );
    const processor = new VehicleDeadlineReconciliation(
      { run } as never,
      { get: () => NodeEnv.Test } as never,
    );
    const first = processor.processDue();
    const second = processor.processDue();
    expect(run).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([first, second]);
  });

  it('logs a structured scheduled-cycle failure without rejecting bootstrap', async () => {
    const processor = new VehicleDeadlineReconciliation(
      {
        run: jest.fn().mockRejectedValue(new Error('database unavailable')),
      } as never,
      { get: () => NodeEnv.Development } as never,
    );
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const interval = jest
      .spyOn(global, 'setInterval')
      .mockReturnValue({ unref: jest.fn() } as never);
    await expect(processor.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'vehicle_deadline_reconciliation_cycle_failed',
        errorType: 'Error',
      }),
    );
    expect(interval).toHaveBeenCalledWith(expect.any(Function), 15 * 60 * 1000);
  });
});
