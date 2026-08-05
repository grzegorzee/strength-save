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
  'rozpietki-hantlami': 'rozpietki-hantlami.mp4',
  'rozpietki-na-lince-crossover': 'rozpietki-na-lince-crossover.mp4',
  'rozpietki-na-wyciagu-z-dolu-gora-klatki': 'rozpietki-na-wyciagu-z-dolu-gora-klatki.mp4',
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
  'sciaganie-drazka-neutralnym-chwytem': 'sciaganie-drazka-neutralnym-chwytem.mp4',
  'podciaganie-na-drazku': 'podciaganie-na-drazku.mp4',
  'wioslowanie-na-lince-siedzac': 'wioslowanie-na-lince-siedzac.mp4',
  'pullover-na-lince': 'pullover-na-lince.mp4',
  'pullover-na-maszynie': 'pullover-na-maszynie.mp4',
  'przenoszenie-hantla-za-glowe': 'przenoszenie-hantla-za-glowe.mp4',
  'sciaganie-linki-prostymi-ramionami': 'sciaganie-linki-prostymi-ramionami.mp4',
  'podciaganie-na-drazku-podchwytem': 'podciaganie-na-drazku-podchwytem.mp4',
  'sciaganie-drazka-podchwytem-wasko': 'sciaganie-drazka-podchwytem-wasko.mp4',
  'podciaganie-wspomagane-na-maszynie': 'podciaganie-wspomagane-na-maszynie.mp4',
  'wioslowanie-na-maszynie-hammer': 'wioslowanie-na-maszynie-hammer.mp4',
  'wioslowanie-na-maszynie-jednoracz-plate-loaded': 'wioslowanie-na-maszynie-jednoracz-plate-loaded.mp4',
  'wioslowanie-t-bar': 'wioslowanie-t-bar.mp4',
  'wioslowanie-pendleya': 'wioslowanie-pendleya.mp4',
  'szrugi-ze-sztanga': 'szrugi-ze-sztanga.mp4',
  'szrugi-z-hantlami': 'szrugi-z-hantlami.mp4',
  // barki
  'wyciskanie-hantli-nad-glowe-siedzac': 'wyciskanie-hantli-nad-glowe-siedzac.mp4',
  'wyciskanie-sztangi-nad-glowe-ohp': 'wyciskanie-sztangi-nad-glowe-ohp.mp4',
  'wznosy-bokiem-lateral-raise': 'wznosy-bokiem-lateral-raise.mp4',
  'odwrotne-rozpietki-tyl-barku': 'odwrotne-rozpietki-tyl-barku.mp4',
  'odwrotne-rozpietki-na-maszynie-reverse-pec-deck': 'odwrotne-rozpietki-na-maszynie-reverse-pec-deck.mp4',
  'podciaganie-sztangi-wzdluz-tulowia-upright-row': 'podciaganie-sztangi-wzdluz-tulowia-upright-row.mp4',
  'arnoldki': 'arnoldki.mp4',
  'wyciskanie-nad-glowe-na-maszynie': 'wyciskanie-nad-glowe-na-maszynie.mp4',
  'landmine-press-wyciskanie-jednoracz': 'landmine-press-wyciskanie-jednoracz.mp4',
  'face-pull': 'face-pull.mp4',
  'wznosy-bokiem-lezac-y-raise': 'wznosy-bokiem-lezac-y-raise.mp4',
  // nogi
  'przysiad-ze-sztanga-high-bar': 'przysiad-ze-sztanga-high-bar.mp4',
  'przysiad-ze-sztanga-low-bar': 'przysiad-ze-sztanga-low-bar.mp4',
  'martwy-ciag-rumunski-rdl': 'martwy-ciag-rumunski-rdl.mp4',
  'martwy-ciag-klasyczny': 'martwy-ciag-klasyczny.mp4',
  'martwy-ciag-sumo-akcent-na-plecy': 'martwy-ciag-sumo-akcent-na-plecy.mp4',
  'good-morning': 'good-morning.mp4',
  'przysiad-pistolet-jednonoz': 'przysiad-pistolet-jednonoz.mp4',
  'burpees': 'burpees.mp4',
  'przysiad-goblet': 'przysiad-goblet.mp4',
  'przysiad-przedni-ze-sztanga-front-squat': 'przysiad-przedni-ze-sztanga-front-squat.mp4',
  'przysiad-do-skrzyni-box-squat': 'przysiad-do-skrzyni-box-squat.mp4',
  'przysiad-w-suwnicy-smitha': 'przysiad-w-suwnicy-smitha.mp4',
  'przysiad-zercher-sztanga-w-zgieciach-lokci': 'przysiad-zercher-sztanga-w-zgieciach-lokci.mp4',
  'przysiad-sumo-z-kettlebell': 'przysiad-sumo-z-kettlebell.mp4',
  'pendulum-squat-maszyna-wahadlowa': 'pendulum-squat-maszyna-wahadlowa.mp4',
  'przysiad-z-masa-ciala-air-squat': 'przysiad-z-masa-ciala-air-squat.mp4',
  'przysiady-wykroczne': 'przysiady-wykroczne.mp4',
  'zakroki-sprinterskie': 'zakroki-sprinterskie.mp4',
  'hack-squat-maszyna': 'hack-squat-maszyna.mp4',
  'hack-squat-odwrotny-twarza-do-oparcia': 'hack-squat-odwrotny-twarza-do-oparcia.mp4',
  'wykrok-w-suwnicy-smitha': 'wykrok-w-suwnicy-smitha.mp4',
  'sissy-squat': 'sissy-squat.mp4',
  'sissy-squat-na-maszynie': 'sissy-squat-na-maszynie.mp4',
  'cossack-squat': 'cossack-squat.mp4',
  'hip-thrust-ze-sztanga': 'hip-thrust-ze-sztanga.mp4',
  'prasa-nozna': 'prasa-nozna.mp4',
  'prasa-nozna-pozioma-siedzac': 'prasa-nozna-pozioma-siedzac.mp4',
  'wykroki-chodzone': 'wykroki-chodzone.mp4',
  'wejscia-przodem-na-skrzynie-ze-sztangielkami': 'wejscia-przodem-na-skrzynie-ze-sztangielkami.mp4',
  'wejscia-bokiem-na-skrzynie': 'wejscia-bokiem-na-skrzynie.mp4',
  'wysoki-step-up-z-hantlami': 'wysoki-step-up-z-hantlami.mp4',
  'wykroki-bulgarskie': 'wykroki-bulgarskie.mp4',
  'wykrok-ukosny-curtsy-lunge': 'wykrok-ukosny-curtsy-lunge.mp4',
  'wykrok-w-tyl-z-akcentem-na-posladek': 'wykrok-w-tyl-z-akcentem-na-posladek.mp4',
  'wymachy-kettlebell': 'wymachy-kettlebell.mp4',
  'wymachy-kettlebell-posterior-chain': 'wymachy-kettlebell-posterior-chain.mp4',
  'wyprosty-nog-na-maszynie': 'wyprosty-nog-na-maszynie.mp4',
  'wyprosty-nog-na-maszynie-jednonoz': 'wyprosty-nog-na-maszynie-jednonoz.mp4',
  'uginanie-nog-na-maszynie-siedzac': 'uginanie-nog-na-maszynie-siedzac.mp4',
  'uginanie-nog-na-maszynie-lezac': 'uginanie-nog-na-maszynie-lezac.mp4',
  'martwy-ciag-z-deficytu': 'martwy-ciag-z-deficytu.mp4',
  'martwy-ciag-czesciowy-z-podstawek-rack-pull': 'martwy-ciag-czesciowy-z-podstawek-rack-pull.mp4',
  'rumunski-martwy-ciag-z-akcentem-na-posladek': 'rumunski-martwy-ciag-z-akcentem-na-posladek.mp4',
  'przeciaganie-linki-miedzy-nogami-cable-pull-through': 'przeciaganie-linki-miedzy-nogami-cable-pull-through.mp4',
  'prostowniki-grzbietu-hyperextensions': 'prostowniki-grzbietu-hyperextensions.mp4',
  'dipy-na-maszynie-assisted-dip-machine': 'dipy-na-maszynie-assisted-dip-machine.mp4',
  'dipy-na-lawce-bench-dips': 'dipy-na-lawce-bench-dips.mp4',
  'dipy-wspomagane-na-maszynie': 'dipy-wspomagane-na-maszynie.mp4',
  'dipy-z-obciazeniem-na-klatke': 'dipy-z-obciazeniem-na-klatke.mp4',
  'brzuszki-klasyczne-crunch': 'brzuszki-klasyczne-crunch.mp4',
  'brzuszki-na-maszynie': 'brzuszki-na-maszynie.mp4',
  'brzuszki-rowerek-bicycle-crunch': 'brzuszki-rowerek-bicycle-crunch.mp4',
  'dead-bug-robak-brzuch': 'dead-bug-robak-brzuch.mp4',
  'ab-rollout': 'ab-rollout.mp4',
  'dead-bug-z-hantlami-obciazony': 'dead-bug-z-hantlami-obciazony.mp4',
  'aniolki-i-demony': 'aniolki-i-demony.mp4',
  'wall-angel': 'wall-angel.mp4',
  'rozciaganie-gumy-nad-glowa': 'rozciaganie-gumy-nad-glowa.mp4',
  'rotacje-ramienia-z-guma-frontem': 'rotacje-ramienia-z-guma-frontem.mp4',
  // ramiona
  'uginanie-sztangi-stojac': 'uginanie-sztangi-stojac.mp4',
  'uginanie-hantli-hammer': 'uginanie-hantli-hammer.mp4',
  'uginania-lokci-z-hantlami-stojac': 'uginania-lokci-z-hantlami-stojac.mp4',
  'uginanie-na-maszynie': 'uginanie-na-maszynie.mp4',
  'uginanie-na-modlitewniku-preacher': 'uginanie-na-modlitewniku-preacher.mp4',
  'uginania-ze-sztanga-na-modlitewniku': 'uginania-ze-sztanga-na-modlitewniku.mp4',
  'uginanie-zottmana-zottman-curl': 'uginanie-zottmana-zottman-curl.mp4',
  'uginanie-hantli-z-supinacja-lawka-skosna': 'uginanie-hantli-z-supinacja-lawka-skosna.mp4',
  'wyprosty-na-lince-pushdown': 'wyprosty-na-lince-pushdown.mp4',
  'uginanie-na-wyciagu-dolnym': 'uginanie-na-wyciagu-dolnym.mp4',
  'uginanie-na-lince-hammer': 'uginanie-na-lince-hammer.mp4',
  'wyciskanie-wasko-close-grip': 'wyciskanie-wasko-close-grip.mp4',
  'wyprosty-francuskie-zza-glowy': 'wyprosty-francuskie-zza-glowy.mp4',
  'prostowanie-ramion-zza-glowy-z-hantla-oburacz-overhead-db-extension': 'prostowanie-ramion-zza-glowy-z-hantla-oburacz-overhead-db-extension.mp4',
  'cuban-press-rotacja-zewnetrzna-z-wyciskaniem': 'cuban-press-rotacja-zewnetrzna-z-wyciskaniem.mp4',
  // brzuch
  'skrety-rosyjskie': 'skrety-rosyjskie.mp4',
  'pelne-spiecie-brzucha-sit-up': 'pelne-spiecie-brzucha-sit-up.mp4',
  'reverse-crunch-na-lawce': 'reverse-crunch-na-lawce.mp4',
  'modlitewnik-cable-crunch': 'modlitewnik-cable-crunch.mp4',
  'modlitewnik-kleczacy-jednostronny-cable-crunch': 'modlitewnik-kleczacy-jednostronny-cable-crunch.mp4',
  'triceps-na-maszynie': 'triceps-na-maszynie.mp4',
  'podciaganie-hantli-wzdluz-tulowia-dumbbell-upright-row': 'podciaganie-hantli-wzdluz-tulowia-dumbbell-upright-row.mp4',
  'wznosy-krazka-w-przod-plate-front-raise': 'wznosy-krazka-w-przod-plate-front-raise.mp4',
  'izometryczny-chwyt-farmera-farmer-s-hold': 'izometryczny-chwyt-farmera-farmer-s-hold.mp4',
  // posladki / nogi (maszyny)
  'glute-bridge': 'glute-bridge.mp4',
  'przywodziciele-na-maszynie': 'przywodziciele-na-maszynie.mp4',
  'odwodziciele-na-maszynie': 'odwodziciele-na-maszynie.mp4',
  'odwodzenie-ud-na-maszynie-z-pochyleniem-tulowia': 'odwodzenie-ud-na-maszynie-z-pochyleniem-tulowia.mp4',
  'wspiecia-na-palce-siedzac': 'wspiecia-na-palce-siedzac.mp4',
  'hip-thrust-wypychanie-bioder': 'hip-thrust-wypychanie-bioder.mp4',
  'hip-thrust-w-maszynie-smith': 'hip-thrust-w-maszynie-smith.mp4',
  'hip-thrust-w-rozstawie-b-stance': 'hip-thrust-w-rozstawie-b-stance.mp4',
  'przysiad-belt-squat-z-pasem-biodrowym': 'przysiad-belt-squat-z-pasem-biodrowym.mp4',
  'pallof-press': 'pallof-press.mp4',
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

/** Z195: poster JPEG miniatury (ta sama nazwa co mp4). WebKit przy
 *  preload=metadata nie maluje żadnej klatki wideo — kafelek renderuje <img>. */
export const getExercisePosterUrl = (name?: string): string | null => {
  const slug = slugifyExercise(name);
  const file = slug ? ANIMATION_FILES[slug] : undefined;
  return file ? `${CDN_BASE}/${file.replace(/\.mp4$/, '.jpg')}` : null;
};
