const API_URL = import.meta.env.VITE_API_URL ?? '';

export type VinLookupResponse = {
  vin: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  fuelType: 'DIESEL' | 'PETROL' | 'LPG' | 'HYBRID' | 'ELECTRIC' | null;
};

export const VehicleByVin = async (
  vin: string,
  signal?: AbortSignal,
): Promise<VinLookupResponse> => {
  const response = await fetch(`${API_URL}/vehicles/vin-lookup/${encodeURIComponent(vin)}`, {
    method: 'GET',
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    throw {
      statusCode: response.status,
      message: 'VIN lookup failed',
    };
  }

  return response.json();
};
