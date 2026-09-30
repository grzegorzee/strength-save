export interface VersionFiles {
  packageJson: string;
  packageLock: string;
  pbxproj: string;
  buildGradle: string;
  releaseTrain: string;
}

export interface VersionState {
  package: string;
  packageLock: Array<string | undefined>;
  iosMarketing: string[];
  iosBuild: string[];
  androidName: string[];
  androidCode: string[];
  train: {
    product?: string;
    ios?: string;
    iosBuild?: number;
    android?: string;
    androidCode?: number;
  };
}

export const SEMVER: RegExp;
export const IOS_TARGET_COUNT: number;
export function parseSemver(value: unknown): { major: number; minor: number; patch: number } | null;
export function bumpSemver(value: string, kind: 'patch' | 'minor' | 'major' | string): string;
export function readVersionState(files: VersionFiles): VersionState;
export function findVersionProblems(state: VersionState): string[];
export function applyVersionChange(
  files: VersionFiles,
  change: { version?: string; iosBuild?: number; androidCode?: number },
): VersionFiles;
