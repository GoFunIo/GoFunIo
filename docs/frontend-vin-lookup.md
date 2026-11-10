# Wyszukiwanie auta po VIN: instrukcja dla FE

`VinAutofillField` (branch `AutoFillVIN`) ma wołać backend zamiast `https://db.vin`. `db.vin` zwracał błędne auta, np. Hondę jako Hyundaia.

## API

`GET /vehicles/vin-lookup/:vin`, autoryzacja jak w reszcie API (cookie, `credentials: 'include'`).

```ts
type VinLookup = {
  vin: string;
  brand: string | null;
  model: string | null;
  year: number | null; // rok modelowy z VIN, może różnić się od roku produkcji
  fuelType: 'DIESEL' | 'PETROL' | 'LPG' | 'HYBRID' | 'ELECTRIC' | null;
};
```

Kształt odpowiedzi jest taki sam jak w obecnym `VinResponse`.

| Status | Kiedy | Proponowany tekst |
| --- | --- | --- |
| 200 | coś rozpoznano, reszta pól to `null` | brak błędu |
| 400 | zły format (17 znaków, bez I, O, Q) | Nieprawidłowy numer VIN. Sprawdź wprowadzony numer. |
| 404 | numer poprawny, ale nieznany dostawcy | Nie znaleziono danych dla tego VIN. Uzupełnij je ręcznie. |
| 429 | ponad 30 zapytań na minutę | Spróbuj ponownie za chwilę. |
| 503 | dostawca nie odpowiada | Nie udało się pobrać danych. Uzupełnij je ręcznie. |

## Zasady

- Uzupełniaj tylko pola, które nie są `null`. Nie czyść tego, co użytkownik już wpisał.
- 404 i 503 nie znaczą, że VIN jest błędny. Nie blokuj zapisu formularza.
- Dla aut z rynku europejskiego zwykle przyjdzie marka i rok, a model i paliwo często będą `null`.
- Lista `FUEL_TYPE_MAP` nie jest już potrzebna, `fuelType` przychodzi w wartościach z formularza.
