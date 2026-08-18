# Domain-owned authorization policies

Nie tworzymy globalnego modułu `can(actor, action, resource)`. Reguły autoryzacji posiada moduł domenowy, którego inwariantu dotyczą (np. Vehicle Access odpowiada za widoczność Vehicle, a Membership za ostatniego ADMINA); prosty AdminGuard pozostaje adapterem HTTP. Guard daje szybkie 403, natomiast lockowany re-check w transakcji chroni przed TOCTOU, więc te sprawdzenia są celowo zachowane mimo pozornego podobieństwa.
