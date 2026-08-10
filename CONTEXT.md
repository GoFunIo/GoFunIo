# Domain Glossary

## User

Osoba posiadająca jedno konto w systemie. User może nie należeć do żadnego Workspace albo należeć do wielu.

## Workspace

Izolowany obszar danych jednej organizacji. W kodzie i bazie jest reprezentowany jako Company.

## Membership

Relacja Usera z Workspace. Określa rolę Usera w danym Workspace oraz stan dostępu, np. oczekujący, aktywny lub odrzucony.

## Active Workspace

Workspace wybrany przez Usera jako bieżący kontekst pracy. Wszystkie operacje na danych organizacji odbywają się w tym kontekście.

## Session Principal

Uwierzytelniona tożsamość Usera w kontekście Active Workspace. Udostępnia wyłącznie dane potrzebne do identyfikacji i autoryzacji, a nie pełny profil Usera.

## Email Verification

Proces potwierdzający, że User kontroluje podany adres email. Powodzenie aktywuje możliwość logowania tym adresem.

## Password Recovery

Proces pozwalający Userowi ustawić nowe hasło bez znajomości obecnego hasła. Obejmuje także pierwsze ustawienie hasła przez zaproszonego Usera.

## Email Change

Proces bezpiecznej zmiany podstawowego adresu email Usera po potwierdzeniu kontroli nad nowym adresem.

## Email Registration

Proces utworzenia nowego Usera przez podanie emaila i hasła. Tworzy również pierwszy Workspace Usera i rozpoczyna Email Verification.

## Credential Authentication

Uwierzytelnienie Usera za pomocą emaila i hasła oraz bezpieczne zarządzanie jego hasłem.

## Google Authentication

Uwierzytelnienie Usera przez zweryfikowaną tożsamość Google. Może zalogować istniejące połączenie, bezpiecznie połączyć konto albo utworzyć nowego Usera z pierwszym Workspace.

## Vehicle

Pojazd należący do jednego Workspace.

## Driver

Kierowca należący do jednego Workspace. Driver może mieć jednocześnie dostęp do wielu Vehicle. ADMIN widzi wszystkich Driverów w Workspace. MANAGER widzi Driverów przypisanych do Vehicle objętych jego Vehicle Access oraz Driverów bez żadnego aktywnego Driver Allocation.

## Vehicle Access

Czasowa relacja Managera z Vehicle. Określa, które Vehicle Manager może widzieć i modyfikować. ADMIN ma dostęp do wszystkich Vehicle w Active Workspace bez tej relacji.

## Driver Allocation

Czasowa relacja Drivera z Vehicle. Relacja jest many-to-many: Driver może być aktywnie przypisany do wielu Vehicle, a Vehicle do wielu Driverów.
