import type { VehicleFuelType } from '../vehicles/vehicles.entity';

export const VIN_DECODER = Symbol('VIN_DECODER');

export interface DecodedVin {
  brand: string | null;
  model: string | null;
  year: number | null;
  fuelType: VehicleFuelType | null;
}

export interface VinDecoder {
  /**
   * Returns only what the provider identifies, or null when it recognizes
   * nothing about the vehicle.
   * @throws VinDecoderUnavailableError when the provider cannot answer.
   */
  decode(vin: string): Promise<DecodedVin | null>;
}

export class VinDecoderUnavailableError extends Error {
  constructor(readonly reason: unknown) {
    super('VIN decoder is unavailable');
    this.name = 'VinDecoderUnavailableError';
  }
}
