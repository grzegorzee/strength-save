// Słownik PL. Klucze hierarchiczne (sekcja.element). Dodanie nowego języka:
// utwórz analogiczny plik (np. en.ts) z tymi samymi kluczami i zarejestruj w ../index.ts.
export const pl = {
  // wspólne
  'common.save': 'Zapisz',
  'common.cancel': 'Anuluj',
  'common.back': 'Wstecz',
  'common.loading': 'Ładowanie...',
  'common.results': 'wyników',

  // nawigacja
  'nav.dashboard': 'Dashboard',
  'nav.history': 'Historia',
  'nav.plan': 'Plan',
  'nav.exercises': 'Ćwiczenia',
  'nav.profile': 'Profil',
  'nav.analytics': 'Analityka',
  'nav.achievements': 'Osiągnięcia',
  'nav.cycles': 'Cykle',
  'nav.settings': 'Ustawienia',
  'nav.measurements': 'Pomiary ciała',

  // profil
  'profile.title': 'Profil',
  'profile.editAvatar': 'Edytuj profil',
  'profile.section.account': 'Konto',
  'profile.account.edit': 'Edytuj profil',
  'profile.account.password': 'Zmień hasło',
  'profile.account.privacy': 'Prywatność',
  'profile.section.preferences': 'Preferencje treningu',
  'profile.pref.restTimer': 'Domyślny czas odpoczynku',
  'profile.pref.units': 'Jednostki',
  'profile.section.app': 'Aplikacja',
  'profile.app.notifications': 'Powiadomienia',
  'profile.app.darkMode': 'Tryb ciemny',
  'profile.app.language': 'Język',
  'profile.section.support': 'Wsparcie',
  'profile.support.advanced': 'Ustawienia zaawansowane',
  'profile.support.help': 'Centrum pomocy',
  'profile.support.contact': 'Kontakt',
  'profile.support.about': 'O aplikacji',
  'profile.logout': 'Wyloguj',
  'profile.editTitle': 'Edytuj profil',
  'profile.nameLabel': 'Nazwa',
  'profile.namePlaceholder': 'Twoja nazwa',
  'profile.langSaved': 'Język zapisany',

  // logowanie
  'login.subtitle': 'Zaloguj się przez Google albo email i hasło',
  'login.tab.google': 'Google',
  'login.tab.email': 'Email + hasło',
  'login.google': 'Zaloguj przez Google',
  'login.googleRegister': 'Załóż konto przez Google',
  'login.email': 'Email',
  'login.password': 'Hasło',
  'login.submit': 'Zaloguj przez email',
  'login.resetPassword': 'Reset hasła',
  'login.noAccount': 'Nie masz jeszcze konta?',
  'login.toRegister': 'Przejdź do rejestracji',
  'login.haveAccount': 'Masz już konto?',
  'login.toLogin': 'Przejdź do logowania',

  // biblioteka ćwiczeń
  'exercises.search': 'Szukaj ćwiczenia...',
  'exercises.muscleGroups': 'Grupy mięśniowe',
  'exercises.all': 'Wszystkie',
  'exercises.title': 'Ćwiczenia',
  'exercises.noResults': 'Brak wyników',

  // szczegóły ćwiczenia
  'detail.instructions': 'Instrukcje',
  'detail.proTip': 'Pro Tip',
  'detail.muscles': 'Zaangażowane mięśnie',
  'detail.equipment': 'Sprzęt',
  'detail.addToWorkout': 'Dodaj do treningu',
} as const;
