/**
 * Warstwa mediów ćwiczeń.
 *
 * Wcześniej osadzaliśmy filmy z YouTube, ale w natywnym WebView (Capacitor iOS)
 * odtwarzacz YouTube rzuca "Error 153" i nie działa. Przeszliśmy na własne
 * animacje hostowane na CDN.
 *
 * Konwencja: pliki nazywamy slugiem ćwiczenia, np.
 *   "Przysiad ze sztangą (Low Bar)" -> przysiad-ze-sztanga-low-bar.mp4
 * i wrzucamy do katalogu `exercises/` na CDN. Po wrzuceniu pliku dodajemy jego
 * slug do mapy `ANIMATION_FILES` poniżej (jedna linia). Dopóki ćwiczenie nie ma
 * animacji, funkcja zwraca null i UI pokazuje placeholder + opis.
 */

// store.gjasionowicz.pl ma WŁĄCZONY Token Auth, więc niepodpisany URL zwraca 403,
// a klucz do podpisywania nie ma prawa trafić do klienta. Animacje ćwiczeń są
// zasobem publicznym, więc leżą na strefie bez Token Auth.
const CDN_BASE = 'https://media.gjasionowicz.pl/exercises';

const POLISH_CHARS: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
};

/**
 * Slugi ćwiczeń, dla których wgrano animację na CDN (klucz = slug, wartość =
 * nazwa pliku). Pusta na start — uzupełniana w miarę dodawania plików.
 * Przykład: 'przysiad-ze-sztanga-low-bar': 'przysiad-ze-sztanga-low-bar.mp4'
 */
const ANIMATION_FILES: Record<string, string> = {
  // klatka
  'wyciskanie-sztangi-na-lawce-plaskiej': 'wyciskanie-sztangi-na-lawce-plaskiej.mp4',
  'wyciskanie-hantli-na-lawce-plaskiej': 'wyciskanie-hantli-na-lawce-plaskiej.mp4',
  'wyciskanie-hantli-lekki-skos': 'wyciskanie-hantli-lekki-skos.mp4',
  'wyciskanie-sztangi-na-skosie': 'wyciskanie-sztangi-na-skosie.mp4',
  'rozpietki-na-lince-crossover': 'rozpietki-na-lince-crossover.mp4',
  'pompki': 'pompki.mp4',
  'wyciskanie-w-maszynie': 'wyciskanie-w-maszynie.mp4',
  'wyciskanie-na-maszynie-hammer': 'wyciskanie-na-maszynie-hammer.mp4',
  'pec-deck-butterfly': 'pec-deck-butterfly.mp4',
  'otwieranie-klatki-hantlami': 'otwieranie-klatki-hantlami.mp4',
  // plecy
  'wioslowanie-sztanga': 'wioslowanie-sztanga.mp4',
  'wioslowanie-hantlami-na-lawce-przodem': 'wioslowanie-hantlami-na-lawce-przodem.mp4',
  'wioslowanie-hantlem-jednoracz-laty': 'wioslowanie-hantlem-jednoracz-laty.mp4',
  'sciaganie-drazka-szeroki-nachwyt': 'sciaganie-drazka-szeroki-nachwyt.mp4',
  'sciaganie-drazka-waski-nachwyt': 'sciaganie-drazka-waski-nachwyt.mp4',
  'podciaganie-na-drazku': 'podciaganie-na-drazku.mp4',
  'wioslowanie-na-lince-siedzac': 'wioslowanie-na-lince-siedzac.mp4',
  'pullover-na-lince': 'pullover-na-lince.mp4',
  'pullover-na-maszynie': 'pullover-na-maszynie.mp4',
  'podciaganie-wspomagane-na-maszynie': 'podciaganie-wspomagane-na-maszynie.mp4',
  'wioslowanie-na-maszynie-hammer': 'wioslowanie-na-maszynie-hammer.mp4',
  'wioslowanie-pendleya': 'wioslowanie-pendleya.mp4',
  'szrugi-z-hantlami': 'szrugi-z-hantlami.mp4',
  // barki
  'wyciskanie-hantli-nad-glowe-siedzac': 'wyciskanie-hantli-nad-glowe-siedzac.mp4',
  'wyciskanie-sztangi-nad-glowe-ohp': 'wyciskanie-sztangi-nad-glowe-ohp.mp4',
  'wznosy-bokiem-lateral-raise': 'wznosy-bokiem-lateral-raise.mp4',
  'odwrotne-rozpietki-tyl-barku': 'odwrotne-rozpietki-tyl-barku.mp4',
  'arnoldki': 'arnoldki.mp4',
  'wyciskanie-nad-glowe-na-maszynie': 'wyciskanie-nad-glowe-na-maszynie.mp4',
  'face-pull': 'face-pull.mp4',
  'wznosy-bokiem-lezac-y-raise': 'wznosy-bokiem-lezac-y-raise.mp4',
  // nogi
  'przysiad-ze-sztanga-high-bar': 'przysiad-ze-sztanga-high-bar.mp4',
  'przysiad-ze-sztanga-low-bar': 'przysiad-ze-sztanga-low-bar.mp4',
  'martwy-ciag-rumunski-rdl': 'martwy-ciag-rumunski-rdl.mp4',
  'martwy-ciag-klasyczny': 'martwy-ciag-klasyczny.mp4',
  'good-morning': 'good-morning.mp4',
  'przysiad-pistolet-jednonoz': 'przysiad-pistolet-jednonoz.mp4',
  'burpees': 'burpees.mp4',
  'przysiad-goblet': 'przysiad-goblet.mp4',
  'przysiad-przedni-ze-sztanga-front-squat': 'przysiad-przedni-ze-sztanga-front-squat.mp4',
  'przysiad-do-skrzyni-box-squat': 'przysiad-do-skrzyni-box-squat.mp4',
  'przysiad-w-suwnicy-smitha': 'przysiad-w-suwnicy-smitha.mp4',
  'przysiad-sumo-z-kettlebell': 'przysiad-sumo-z-kettlebell.mp4',
  'pendulum-squat-maszyna-wahadlowa': 'pendulum-squat-maszyna-wahadlowa.mp4',
  'przysiad-z-masa-ciala-air-squat': 'przysiad-z-masa-ciala-air-squat.mp4',
  'przysiady-wykroczne': 'przysiady-wykroczne.mp4',
  'zakroki-sprinterskie': 'zakroki-sprinterskie.mp4',
  'hack-squat-maszyna': 'hack-squat-maszyna.mp4',
  'sissy-squat': 'sissy-squat.mp4',
  'cossack-squat': 'cossack-squat.mp4',
  'hip-thrust-ze-sztanga': 'hip-thrust-ze-sztanga.mp4',
  'prasa-nozna-pozioma-siedzac': 'prasa-nozna-pozioma-siedzac.mp4',
  'wykroki-chodzone': 'wykroki-chodzone.mp4',
  'wejscia-przodem-na-skrzynie-ze-sztangielkami': 'wejscia-przodem-na-skrzynie-ze-sztangielkami.mp4',
  'wysoki-step-up-z-hantlami': 'wysoki-step-up-z-hantlami.mp4',
  'wykrok-ukosny-curtsy-lunge': 'wykrok-ukosny-curtsy-lunge.mp4',
  'wymachy-kettlebell': 'wymachy-kettlebell.mp4',
  'wymachy-kettlebell-posterior-chain': 'wymachy-kettlebell-posterior-chain.mp4',
  'wyprosty-nog-na-maszynie': 'wyprosty-nog-na-maszynie.mp4',
  'wyprosty-nog-na-maszynie-jednonoz': 'wyprosty-nog-na-maszynie-jednonoz.mp4',
  'martwy-ciag-z-deficytu': 'martwy-ciag-z-deficytu.mp4',
  'martwy-ciag-czesciowy-z-podstawek-rack-pull': 'martwy-ciag-czesciowy-z-podstawek-rack-pull.mp4',
  'rumunski-martwy-ciag-z-akcentem-na-posladek': 'rumunski-martwy-ciag-z-akcentem-na-posladek.mp4',
  'prostowniki-grzbietu-hyperextensions': 'prostowniki-grzbietu-hyperextensions.mp4',
  'dipy-na-lawce-bench-dips': 'dipy-na-lawce-bench-dips.mp4',
  'dipy-z-obciazeniem-na-klatke': 'dipy-z-obciazeniem-na-klatke.mp4',
  'brzuszki-rowerek-bicycle-crunch': 'brzuszki-rowerek-bicycle-crunch.mp4',
  'dead-bug-robak-brzuch': 'dead-bug-robak-brzuch.mp4',
  'ab-rollout': 'ab-rollout.mp4',
  'dead-bug-z-hantlami-obciazony': 'dead-bug-z-hantlami-obciazony.mp4',
  'aniolki-i-demony': 'aniolki-i-demony.mp4',
  'rozciaganie-gumy-nad-glowa': 'rozciaganie-gumy-nad-glowa.mp4',
  // ramiona
  'uginania-lokci-z-hantlami-stojac': 'uginania-lokci-z-hantlami-stojac.mp4',
  'uginanie-na-modlitewniku-preacher': 'uginanie-na-modlitewniku-preacher.mp4',
  'uginania-ze-sztanga-na-modlitewniku': 'uginania-ze-sztanga-na-modlitewniku.mp4',
  'uginanie-zottmana-zottman-curl': 'uginanie-zottmana-zottman-curl.mp4',
  'uginanie-hantli-z-supinacja-lawka-skosna': 'uginanie-hantli-z-supinacja-lawka-skosna.mp4',
  'wyprosty-na-lince-pushdown': 'wyprosty-na-lince-pushdown.mp4',
  'uginanie-na-lince-hammer': 'uginanie-na-lince-hammer.mp4',
  'wyciskanie-wasko-close-grip': 'wyciskanie-wasko-close-grip.mp4',
  'wyprosty-francuskie-zza-glowy': 'wyprosty-francuskie-zza-glowy.mp4',
  // brzuch
  'skrety-rosyjskie': 'skrety-rosyjskie.mp4',
  'pelne-spiecie-brzucha-sit-up': 'pelne-spiecie-brzucha-sit-up.mp4',
  'reverse-crunch-na-lawce': 'reverse-crunch-na-lawce.mp4',
  'modlitewnik-cable-crunch': 'modlitewnik-cable-crunch.mp4',
  'modlitewnik-kleczacy-jednostronny-cable-crunch': 'modlitewnik-kleczacy-jednostronny-cable-crunch.mp4',
  'triceps-na-maszynie': 'triceps-na-maszynie.mp4',
  'wznosy-krazka-w-przod-plate-front-raise': 'wznosy-krazka-w-przod-plate-front-raise.mp4',
  // posladki / nogi (maszyny)
  'glute-bridge': 'glute-bridge.mp4',
  'przywodziciele-na-maszynie': 'przywodziciele-na-maszynie.mp4',
  'wspiecia-na-palce-siedzac': 'wspiecia-na-palce-siedzac.mp4',
  'przysiad-belt-squat-z-pasem-biodrowym': 'przysiad-belt-squat-z-pasem-biodrowym.mp4',
};

/** Zamienia nazwę ćwiczenia na slug (bez polskich znaków, spacje -> myślniki). */
export const slugifyExercise = (name?: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => POLISH_CHARS[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/** Zwraca URL animacji ćwiczenia z CDN albo null, jeśli pliku jeszcze nie ma. */
export const getExerciseAnimationUrl = (name?: string): string | null => {
  const slug = slugifyExercise(name);
  const file = slug ? ANIMATION_FILES[slug] : undefined;
  return file ? `${CDN_BASE}/${file}` : null;
};

/** X27 WP-E: zdjęcie grupy mięśniowej dla kafla/hero zakładki Ćwiczenia.
 *  Statyczne assety w public/exercise-groups/ (dostarcza WP-IMG); brak pliku
 *  obsługuje UI fallbackiem (onError → gradient), więc helper nie zna manifestu.
 *  BASE_URL jak przy dźwiękach przerwy (rest-sound.ts) — respektuje podkatalog. */
export const getGroupImageUrl = (categoryId: string): string =>
  `${import.meta.env.BASE_URL ?? '/'}exercise-groups/${categoryId}.webp`;

/** X28 WP-F: hero szablonu planu (Browse plans). Pliki w public/plan-templates/
 *  nazwane 1:1 id szablonu (tpl-*.webp); brak/błąd pliku obsługuje UI
 *  (onError → karta jak dotąd), test kompletności pilnuje pełnej listy. */
export const getPlanTemplateImageUrl = (templateId: string): string =>
  `${import.meta.env.BASE_URL ?? '/'}plan-templates/${templateId}.webp`;

/** X28 WP-F: ilustracje pustych stanów (pro-look dark-gym-v1) w public/empty-states/. */
export const getEmptyStateImageUrl = (name: 'history' | 'measurements' | 'no-plan' | 'strava'): string =>
  `${import.meta.env.BASE_URL ?? '/'}empty-states/${name}.webp`;

/** X28 WP-F: hero ekranu paywalla PRO (public/paywall/hero.webp). */
export const getPaywallHeroUrl = (): string =>
  `${import.meta.env.BASE_URL ?? '/'}paywall/hero.webp`;

/** Z195: poster JPEG miniatury (ta sama nazwa co mp4). WebKit przy
 *  preload=metadata nie maluje żadnej klatki wideo — kafelek renderuje <img>. */
export const getExercisePosterUrl = (name?: string): string | null => {
  const slug = slugifyExercise(name);
  const file = slug ? ANIMATION_FILES[slug] : undefined;
  return file ? `${CDN_BASE}/${file.replace(/\.mp4$/, '.jpg')}` : null;
};
