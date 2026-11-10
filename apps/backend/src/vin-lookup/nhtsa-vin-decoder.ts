import { Injectable } from '@nestjs/common';
import { VehicleFuelType } from '../vehicles/vehicles.entity';
import {
  VinDecoderUnavailableError,
  type DecodedVin,
  type VinDecoder,
} from './vin-decoder';

const API_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';
const TIMEOUT_MS = 8_000;

/** Common European manufacturer codes for which NHTSA returns no make. */
const BRAND_BY_WMI: Readonly<Record<string, string>> = {
  TMA: 'Hyundai',
  TMB: 'Škoda',
  U5Y: 'Kia',
  UU1: 'Dacia',
  VF1: 'Renault',
  VF7: 'Citroën',
  VSS: 'SEAT',
};

const FUEL_TYPE_BY_NHTSA_NAME: Readonly<Record<string, VehicleFuelType>> = {
  Gasoline: VehicleFuelType.PETROL,
  Diesel: VehicleFuelType.DIESEL,
  Electric: VehicleFuelType.ELECTRIC,
  'Liquefied Petroleum Gas (propane or LPG)': VehicleFuelType.LPG,
};

interface NhtsaResult {
  Make?: unknown;
  Model?: unknown;
  ModelYear?: unknown;
  FuelTypePrimary?: unknown;
  FuelTypeSecondary?: unknown;
  ElectrificationLevel?: unknown;
}

@Injectable()
export class NhtsaVinDecoder implements VinDecoder {
  async decode(vin: string): Promise<DecodedVin | null> {
    const result = await this.fetchResult(vin);
    const make = text(result.Make);
    const brand = make
      ? formatBrand(make)
      : (BRAND_BY_WMI[vin.slice(0, 3)] ?? null);
    const model = text(result.Model);
    if (!brand && !model) return null;
    return {
      brand,
      model,
      year: parseYear(result.ModelYear),
      fuelType: mapFuelType(result),
    };
  }

  private async fetchResult(vin: string): Promise<NhtsaResult> {
    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(vin)}?format=json`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'gofunio-backend/1.0',
          },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );
      if (!response.ok) {
        throw new Error(`NHTSA responded with status ${response.status}`);
      }
      const body = (await response.json()) as { Results: NhtsaResult[] };
      const [result] = body.Results;
      if (!result) throw new Error('NHTSA response has no result');
      return result;
    } catch (error) {
      throw new VinDecoderUnavailableError(error);
    }
  }
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed !== 'Not Applicable' ? trimmed : null;
}

/** NHTSA returns makes in upper case; short ones such as BMW stay that way. */
function formatBrand(make: string): string {
  if (make.length <= 3) return make;
  return make
    .toLowerCase()
    .replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toUpperCase());
}

function parseYear(value: unknown): number | null {
  const year = text(value);
  return year && /^\d{4}$/.test(year) ? Number(year) : null;
}

function mapFuelType(result: NhtsaResult): VehicleFuelType | null {
  const primary = text(result.FuelTypePrimary);
  const isHybrid =
    text(result.ElectrificationLevel)?.includes('HEV') ||
    (text(result.FuelTypeSecondary) === 'Electric' && primary !== 'Electric');
  if (isHybrid) return VehicleFuelType.HYBRID;
  return primary ? (FUEL_TYPE_BY_NHTSA_NAME[primary] ?? null) : null;
}
