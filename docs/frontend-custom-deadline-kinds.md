# Własne typy terminów: instrukcja dla FE

Backend obsługuje olej, świece i własne rodzaje terminów. Front musi dodać zarządzanie typami, daty w formularzu auta i wyświetlanie etykiet z API.

Pełny kontrakt jest też w Swaggerze, w sekcji **Vehicle Deadline Kinds**.

## Zanim zaczniesz

1. Zmerguj `AutoFillVIN` i `jspdf` do `develop`. `AutoFillVIN` przebudowuje `AddVehicleForm`.
2. Uruchom migracje BE (`make dev` robi to samo). Każda firma dostanie typy "Wymiana oleju" i "Wymiana świec".
3. Najpierw zrób krok 1 z tabeli "Co zmienić na froncie", czyli odporność na nieznany rodzaj.

**Uwaga:** `ReminderRow`, `NotificationRow` i `RemindersDropdown` wywalają się na nieznanym `deadlineKind`, bo ikona z `Record` jest wtedy `undefined`. Dopóki krok 1 nie jest wdrożony, nie ustawiaj dat własnych typów (np. przez Swaggera) na wspólnym środowisku.

Obecny front po deployu BE działa bez zmian, bo nie ma jak ustawić takiej daty.

## Pojęcia

- **Rodzaj terminu** ma klucz (`key`) i etykietę (`label`).
- Rodzaje wbudowane: `OC`, `AC`, `TECHNICAL_INSPECTION`. Ich daty zostają w polach `ocExpiry`, `acExpiry`, `technicalInspectionExpiry`.
- Rodzaje własne: kluczem jest UUID. Lista jest wspólna dla firmy, a data osobna dla każdego auta.
- Nie porównuj etykiet na sztywno. Wyświetlaj `label` lub `deadlineLabel` z API.

## Nowe API: `/vehicle-deadline-kinds`

Autoryzacja jak w reszcie API (cookie, `credentials: 'include'`).

| Metoda | Ścieżka | Body | Odpowiedź | Kto |
| --- | --- | --- | --- | --- |
| GET | `/vehicle-deadline-kinds` | brak | 200, `DeadlineKindOption[]` | każdy członek firmy |
| POST | `/vehicle-deadline-kinds` | `{ label }` | 201, `DeadlineKindOption` | OWNER, ADMIN |
| PATCH | `/vehicle-deadline-kinds/:id` | `{ label }` | 200, `DeadlineKindOption` | OWNER, ADMIN |
| DELETE | `/vehicle-deadline-kinds/:id` | brak | 204 | OWNER, ADMIN |

```ts
type DeadlineKindOption = {
  key: string; // 'OC' | 'AC' | 'TECHNICAL_INSPECTION' | uuid
  label: string;
  builtIn: boolean; // wbudowanych nie można zmieniać ani usuwać
};
```

GET zwraca najpierw wbudowane, potem własne alfabetycznie. Do blokowania akcji w UI użyj istniejącego `canManageAlertPolicy`.

Reguły:

- `label`: po przycięciu spacji 1 do 60 znaków, bez znaków sterujących (np. nowej linii).
- Nazwa unikalna w firmie, bez względu na wielkość liter.
- Maksymalnie 20 własnych typów na firmę.
- Nowy typ jest od razu włączony w polityce alertów.
- Usunięcie jest nieodwracalne: kasuje daty tego typu we wszystkich autach i znikają jego alerty oraz powiadomienia. Dodaj okno potwierdzenia.
- Po zmianie nazwy alerty pokazują nową nazwę. Powiadomienia już utworzone zachowują starą.

Błędy:

| Status | `code` | Kiedy | Proponowany tekst |
| --- | --- | --- | --- |
| 400 | brak | zła etykieta, niepoprawny UUID | walidacja formularza |
| 403 | brak | rola inna niż OWNER, ADMIN | ukryj akcję |
| 404 | brak | typ nie istnieje lub jest z innej firmy | domyślny komunikat |
| 409 | `VEHICLE_DEADLINE_KIND_LABEL_IN_USE` | nazwa zajęta | Typ o takiej nazwie już istnieje. |
| 409 | `VEHICLE_DEADLINE_KIND_LIMIT_REACHED` | limit 20 | Osiągnięto limit 20 własnych typów. |

## Zmiany w istniejących endpointach

| Endpoint | Zmiana |
| --- | --- |
| `GET /vehicles`, `GET /vehicles/:id`, odpowiedzi POST i PATCH | nowe `customDeadlines: { kindId, label, date }[]`, tylko typy z ustawioną datą |
| `POST /vehicles`, `PATCH /vehicles/:id` | opcjonalne `customDeadlines: { kindId, date }[]` |
| `GET /vehicle-deadline-alerts` | `deadlineKind` może być UUID, nowe `deadlineLabel`, filtr `?deadlineKind=` przyjmuje też UUID |
| `GET /notifications` | `deadlineKind` może być UUID, nowe `deadlineLabel` |
| `GET`, `PATCH /alert-policy` | `enabledDeadlineKinds` zawiera też UUID, maksymalnie 23 pozycje |

Zapis dat w aucie:

- Brak pola `customDeadlines` oznacza brak zmian.
- Typy spoza listy zostają bez zmian.
- `date: 'YYYY-MM-DD'` ustawia datę. `date: null`, pusty tekst lub brak `date` usuwa ją.
- Można wysyłać przy każdym zapisie pełną listę. BE reaguje tylko na faktyczne zmiany, więc nie powstaną duplikaty powiadomień.
- Każdy `kindId` może wystąpić raz, maksymalnie 20 pozycji.
- Typ nieznany lub z innej firmy daje 400.

`PATCH /alert-policy` zastępuje całą listę `enabledDeadlineKinds`. Wyślij też klucze własnych typów, inaczej zostaną wyłączone.

Czego BE nie robi:

- `sortBy` i `expiryType` w `GET /vehicles` działają tylko dla OC, AC i przeglądu.
- Terminy są wyłącznie po dacie, bez kilometrów.
- SSE odświeża alerty i powiadomienia, ale nie listę typów, polityki ani aut. Po POST, PATCH i DELETE typu unieważnij je sam w `onSuccess`.

## Co zmienić na froncie

Ścieżki względem `apps/frontend/src`. Pliki z `features/dashboard` skrócone do `fd/`.

| Krok | Plik | Zmiana |
| --- | --- | --- |
| 1 | `fd/types/NotificationCenterTypes.ts` | `DeadlineKind = string`, `deadlineLabel: string` w `VehicleDeadlineAlert` i `NotificationItem` |
| 1 | `utils/formatDeadline.ts` | nowy `getDeadlineKindIcon(kind)` z ikoną domyślną |
| 1 | `fd/widgets/ReminderRow.tsx`, `NotificationRow.tsx`, `RemindersDropdown.tsx` | ikona z `getDeadlineKindIcon` zamiast lokalnego `Record`, etykieta z `item.deadlineLabel` |
| 2 | `fd/api/notificationCenter.api.ts`, `fd/hooks/notificationCenter.hooks.ts` | GET, POST, PATCH, DELETE typów |
| 2 | `utils/getErrorMessage.ts` | dwa nowe kody z tabeli błędów |
| 3 | `fd/widgets/AlertPolicyCard.tsx` | lista rodzajów z API zamiast `ALL_DEADLINE_KINDS`, dodawanie, zmiana nazwy i usuwanie, tekst bez "OC/AC/przeglądu" |
| 4 | `fd/types/VehicleTypes.ts`, `fd/types/FormTypes.ts`, `fd/lib/formValidationRules.ts` | pole `customDeadlines` |
| 4 | `fd/api/vehicles.api.ts` | `customDeadlines` w `buildVehiclePayload` |
| 4 | `fd/forms/AddVehicleForm.tsx` | sekcja "Inne terminy", `FormDatePicker` dla każdego własnego typu, aktywny także w trybie "Odnów" |
| 5 | `routes/dashboard/my-cars/$carId.tsx`, `getDeadlineCardVisual` | kafelki własnych terminów, tekst z etykiety |
| 5 | `fd/widgets/ReminderRow.tsx`, `DeadlineAlertsSection.tsx` | filtr i zakładka "Inne", jeden wspólny `AlertFilterType` (dziś są 2 kopie) |

`routes/dashboard/(home)/index.tsx` nie wymaga zmian. Kafelki przeglądów i ubezpieczeń zostają, a licznik `activeAlertCount` obejmuje też własne typy.

Ikona z domyślną wartością:

```ts
const DEADLINE_ICONS: Record<string, LucideIcon> = {
  TECHNICAL_INSPECTION: CalendarCog,
  OC: ShieldAlert,
  AC: ShieldCheck,
};

export const getDeadlineKindIcon = (kind: string): LucideIcon =>
  DEADLINE_ICONS[kind] ?? Wrench;
```

Filtr alertów:

```ts
export type AlertFilterType = 'all' | 'inspection' | 'insurance' | 'other';

const matchesFilter = (kind: string, filterType: AlertFilterType) => {
  if (filterType === 'all') return true;
  if (filterType === 'inspection') return kind === 'TECHNICAL_INSPECTION';
  if (filterType === 'insurance') return kind === 'OC' || kind === 'AC';
  return !['OC', 'AC', 'TECHNICAL_INSPECTION'].includes(kind);
};
```

Formularz auta. W formularzu trzymaj `customDeadlines` jako mapę `kindId -> data`, a pole nazywaj `customDeadlines.${kind.key}`:

```ts
// mapInitialDataToForm
customDeadlines: Object.fromEntries(
  (data?.customDeadlines ?? []).map(({ kindId, date }) => [kindId, date]),
),

// buildVehiclePayload
customDeadlines: Object.entries(form.customDeadlines ?? {}).map(
  ([kindId, date]) => ({ kindId, date: date || null }),
),

// formValidationRules
customDeadlines: yup.object().optional(),
```

Lista pól w sekcji "Inne terminy": wynik `GET /vehicle-deadline-kinds` odfiltrowany po `!builtIn`.

## Jak sprawdzić

- [ ] Lista typów pokazuje OC, AC, przegląd, olej i świece.
- [ ] OWNER i ADMIN dodają, zmieniają i usuwają typ. MANAGER widzi listę bez tych akcji.
- [ ] Duplikat nazwy i 21. własny typ pokazują polski komunikat.
- [ ] Data oleju ustawiona na 7 dni naprzód daje alert, powiadomienie i mail w Mailpit.
- [ ] Wyczyszczenie daty usuwa alert. Zmiana daty aktualizuje alert.
- [ ] Odznaczenie typu w polityce ukrywa jego alerty, a zapis polityki nie wyłącza pozostałych typów.
- [ ] "Odnów" z alertu własnego typu pozwala zmienić jego datę.
- [ ] Usunięcie typu czyści daty, alerty i powiadomienia.
- [ ] Kafelek własnego terminu widać na stronie auta.
- [ ] Zakładka "Inne" filtruje alerty własnych typów.
