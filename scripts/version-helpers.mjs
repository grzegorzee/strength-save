// Jedno źródło prawdy wersji produktu: package.json `version` (SemVer MAJOR.MINOR.PATCH).
// Wszystkie pozostałe miejsca są jej kopiami i muszą być równe:
//   - package-lock.json (root + packages[""])
//   - ios/App/App.xcodeproj/project.pbxproj: MARKETING_VERSION ×6 (App, StrengthWatch, widgety)
//   - android/app/build.gradle: versionName
//   - release/release-train.json: product.version, ios.version, android.version
// Numer builda (CURRENT_PROJECT_VERSION ×6 iOS, versionCode Android) rośnie o 1 na każdy upload.
// Czyste funkcje (bez fs) — testowane w src/test/version-scheme.test.ts.

export const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export const IOS_TARGET_COUNT = 6;

export const parseSemver = (value) => {
  const match = SEMVER.exec(String(value ?? ''));
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
};

export const bumpSemver = (value, kind) => {
  const parsed = parseSemver(value);
  if (!parsed) throw new Error(`Niepoprawna wersja SemVer: ${value}`);
  if (kind === 'major') return `${parsed.major + 1}.0.0`;
  if (kind === 'minor') return `${parsed.major}.${parsed.minor + 1}.0`;
  if (kind === 'patch') return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  throw new Error(`Nieznany rodzaj bumpu: ${kind} (dozwolone: patch|minor|major)`);
};

const all = (text, regex) => [...text.matchAll(regex)].map((match) => match[1].trim());

/** Odczyt wszystkich kopii wersji i numerów builda z treści plików. */
export const readVersionState = (files) => {
  const pkg = JSON.parse(files.packageJson);
  const lock = JSON.parse(files.packageLock);
  const train = JSON.parse(files.releaseTrain);
  return {
    package: pkg.version,
    packageLock: [lock.version, lock.packages?.['']?.version],
    iosMarketing: all(files.pbxproj, /MARKETING_VERSION = ([^;]+);/g),
    iosBuild: all(files.pbxproj, /CURRENT_PROJECT_VERSION = ([^;]+);/g),
    androidName: all(files.buildGradle, /versionName "([^"]+)"/g),
    androidCode: all(files.buildGradle, /versionCode (\d+)/g),
    train: {
      product: train.product?.version,
      ios: train.ios?.version,
      iosBuild: train.ios?.build,
      android: train.android?.version,
      androidCode: train.android?.versionCode,
    },
  };
};

/** Lista niespójności; pusta = wszystkie miejsca równe. */
export const findVersionProblems = (state) => {
  const problems = [];
  const version = state.package;
  if (!parseSemver(version)) problems.push(`package.json version "${version}" nie jest SemVer MAJOR.MINOR.PATCH`);
  state.packageLock.forEach((value, index) => {
    if (value !== version) problems.push(`package-lock.json [${index === 0 ? 'root' : 'packages[""]'}] = ${value}`);
  });
  if (state.iosMarketing.length !== IOS_TARGET_COUNT) {
    problems.push(`MARKETING_VERSION: ${state.iosMarketing.length} wystąpień, oczekiwano ${IOS_TARGET_COUNT}`);
  }
  for (const value of new Set(state.iosMarketing)) {
    if (value !== version) problems.push(`MARKETING_VERSION = ${value}`);
  }
  if (state.iosBuild.length !== IOS_TARGET_COUNT) {
    problems.push(`CURRENT_PROJECT_VERSION: ${state.iosBuild.length} wystąpień, oczekiwano ${IOS_TARGET_COUNT}`);
  }
  const iosBuilds = [...new Set(state.iosBuild)];
  if (iosBuilds.length > 1) problems.push(`CURRENT_PROJECT_VERSION rozjechany: ${iosBuilds.join(', ')}`);
  if (iosBuilds.some((value) => !/^\d+$/.test(value))) problems.push('CURRENT_PROJECT_VERSION nie jest liczbą');
  if (state.androidName.length !== 1 || state.androidName[0] !== version) {
    problems.push(`android versionName = ${state.androidName.join(', ') || 'brak'}`);
  }
  if (state.androidCode.length !== 1) problems.push('android versionCode: oczekiwano jednego wystąpienia');
  if (state.train.product !== version) problems.push(`release-train product.version = ${state.train.product}`);
  if (state.train.ios !== version) problems.push(`release-train ios.version = ${state.train.ios}`);
  if (state.train.android !== version) problems.push(`release-train android.version = ${state.train.android}`);
  if (iosBuilds.length === 1 && String(state.train.iosBuild) !== iosBuilds[0]) {
    problems.push(`release-train ios.build = ${state.train.iosBuild}, pbxproj = ${iosBuilds[0]}`);
  }
  if (state.androidCode.length === 1 && String(state.train.androidCode) !== state.androidCode[0]) {
    problems.push(`release-train android.versionCode = ${state.train.androidCode}, build.gradle = ${state.androidCode[0]}`);
  }
  return problems;
};

const PENDING_STATE = 'source-version-requires-current-delivery-verification';

// Zmiana źródła unieważnia dowód dostarczenia (zasada 14): stan wraca do „wymaga
// weryfikacji”, a poprzedni dowód zostaje jako priorDeliveryEvidence.
const invalidateDelivery = (entry) => {
  if (!entry || entry.state === PENDING_STATE) return;
  if (entry.deliveryEvidence) entry.priorDeliveryEvidence = entry.deliveryEvidence;
  delete entry.deliveryEvidence;
  delete entry.verifiedDelivery;
  entry.state = PENDING_STATE;
};

const replaceJsonVersion = (text, mutate) => {
  const data = JSON.parse(text);
  mutate(data);
  return `${JSON.stringify(data, null, 2)}\n`;
};

/**
 * Nowe treści plików po zmianie wersji i/lub builda. Wejście musi być spójne
 * (findVersionProblems puste), wyjście jest ponownie walidowane przez wywołującego.
 */
export const applyVersionChange = (files, { version, iosBuild, androidCode }) => {
  const state = readVersionState(files);
  const nextVersion = version ?? state.package;
  const nextIosBuild = iosBuild ?? Number(state.iosBuild[0]);
  const nextAndroidCode = androidCode ?? Number(state.androidCode[0]);
  if (!parseSemver(nextVersion)) throw new Error(`Niepoprawna wersja: ${nextVersion}`);
  if (!Number.isSafeInteger(nextIosBuild) || nextIosBuild < 1) throw new Error('Niepoprawny build iOS');
  if (!Number.isSafeInteger(nextAndroidCode) || nextAndroidCode < 1) throw new Error('Niepoprawny versionCode');
  const versionChanged = nextVersion !== state.package;
  const iosChanged = String(nextIosBuild) !== state.iosBuild[0] || versionChanged;
  const androidChanged = String(nextAndroidCode) !== state.androidCode[0] || versionChanged;

  return {
    packageJson: replaceJsonVersion(files.packageJson, (data) => { data.version = nextVersion; }),
    packageLock: replaceJsonVersion(files.packageLock, (data) => {
      data.version = nextVersion;
      if (data.packages?.['']) data.packages[''].version = nextVersion;
    }),
    pbxproj: files.pbxproj
      .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${nextVersion};`)
      .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${nextIosBuild};`),
    buildGradle: files.buildGradle
      .replace(/versionName "[^"]+"/, `versionName "${nextVersion}"`)
      .replace(/versionCode \d+/, `versionCode ${nextAndroidCode}`),
    releaseTrain: replaceJsonVersion(files.releaseTrain, (data) => {
      data.product.version = nextVersion;
      data.ios.version = nextVersion;
      data.ios.build = nextIosBuild;
      data.android.version = nextVersion;
      data.android.versionCode = nextAndroidCode;
      if (iosChanged) invalidateDelivery(data.ios);
      if (androidChanged) invalidateDelivery(data.android);
    }),
  };
};
