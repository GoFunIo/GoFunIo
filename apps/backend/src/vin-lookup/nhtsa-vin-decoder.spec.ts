import { NhtsaVinDecoder } from './nhtsa-vin-decoder';
import { VinDecoderUnavailableError } from './vin-decoder';

const HONDA_VIN = '1HGCM82633A004352';

describe('NhtsaVinDecoder', () => {
  const decoder = new NhtsaVinDecoder();
  let fetchMock: jest.SpyInstance;

  function respondWith(result: Record<string, string>): void {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ Results: [result] }), { status: 200 }),
    );
  }

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => fetchMock.mockRestore());

  it('requests the VIN and normalizes a complete result', async () => {
    respondWith({
      Make: 'HONDA',
      Model: 'Accord',
      ModelYear: '2003',
      FuelTypePrimary: 'Gasoline',
      FuelTypeSecondary: '',
      ElectrificationLevel: '',
    });

    await expect(decoder.decode(HONDA_VIN)).resolves.toEqual({
      brand: 'Honda',
      model: 'Accord',
      year: 2003,
      fuelType: 'PETROL',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${HONDA_VIN}?format=json`,
      expect.anything(),
    );
  });

  it.each([
    ['BMW', 'BMW'],
    ['MERCEDES-BENZ', 'Mercedes-Benz'],
    ['ALFA ROMEO', 'Alfa Romeo'],
  ])('formats make %s as %s', async (Make, brand) => {
    respondWith({ Make });

    await expect(decoder.decode(HONDA_VIN)).resolves.toMatchObject({ brand });
  });

  it('returns partial data with missing fields as null', async () => {
    respondWith({
      Make: 'VOLKSWAGEN',
      Model: '',
      ModelYear: '',
      FuelTypePrimary: '',
    });

    await expect(decoder.decode('WVWZZZ1JZXW000001')).resolves.toEqual({
      brand: 'Volkswagen',
      model: null,
      year: null,
      fuelType: null,
    });
  });

  it('falls back to the manufacturer code when NHTSA has no make', async () => {
    respondWith({ Make: '', Model: '' });

    await expect(decoder.decode('TMBJJ7NE0K0000001')).resolves.toMatchObject({
      brand: 'Škoda',
    });
  });

  it('returns null when neither brand nor model is identified', async () => {
    respondWith({ Make: '', Model: 'Not Applicable', ModelYear: '2010' });

    await expect(decoder.decode('XXXZZZ1JZXW000001')).resolves.toBeNull();
  });

  it.each([
    [{ FuelTypePrimary: 'Diesel' }, 'DIESEL'],
    [
      {
        FuelTypePrimary: 'Electric',
        ElectrificationLevel: 'BEV (Battery Electric Vehicle)',
      },
      'ELECTRIC',
    ],
    [{ FuelTypePrimary: 'Liquefied Petroleum Gas (propane or LPG)' }, 'LPG'],
    [{ FuelTypePrimary: 'Gasoline', FuelTypeSecondary: 'Electric' }, 'HYBRID'],
    [
      {
        FuelTypePrimary: 'Gasoline',
        ElectrificationLevel: 'Strong HEV (Hybrid Electric Vehicle)',
      },
      'HYBRID',
    ],
    [{ FuelTypePrimary: 'Fuel Cell' }, null],
  ])('maps fuel data %j to %s', async (fuel, fuelType) => {
    respondWith({ Make: 'TOYOTA', ...fuel });

    await expect(decoder.decode(HONDA_VIN)).resolves.toMatchObject({
      fuelType,
    });
  });

  it.each([
    ['an error status', () => new Response('', { status: 500 })],
    ['malformed JSON', () => new Response('<html>', { status: 200 })],
    ['no results', () => new Response('{"Results":[]}', { status: 200 })],
  ])('reports the provider as unavailable on %s', async (_, response) => {
    fetchMock.mockResolvedValue(response());

    await expect(decoder.decode(HONDA_VIN)).rejects.toBeInstanceOf(
      VinDecoderUnavailableError,
    );
  });

  it('reports the provider as unavailable on a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(decoder.decode(HONDA_VIN)).rejects.toBeInstanceOf(
      VinDecoderUnavailableError,
    );
  });
});
