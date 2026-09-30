export declare const PROJECT_ID: string;
export declare const READONLY_SA: string;
export declare const DEFAULT_MAX_DOCS: number;
export declare const FIRESTORE_BASE: string;

export declare function assertReadOnlyRequest(method: string, url: string): void;

export interface ReadBudget {
  readonly used: number;
  readonly remaining: number;
  readonly maxDocs: number;
  allowance(requested?: number): number;
  consume(count: number): void;
}
export declare function createReadBudget(maxDocs?: number): ReadBudget;

export declare class ReadLimitReached extends Error {
  constructor(maxDocs: number);
}

export type FirestoreValue = Record<string, unknown>;
export declare function toFirestoreValue(value: unknown): FirestoreValue;
export declare function fromFirestoreValue(value: unknown): unknown;
export declare function fromFirestoreFields(fields: Record<string, unknown> | undefined): Record<string, unknown>;
export declare function parseWhere(expr: string): { fieldFilter: { field: { fieldPath: string }; op: string; value: FirestoreValue } };

export interface StructuredQueryInput {
  collectionPath: string;
  where?: string[];
  orderBy?: string;
  limit?: number;
}
export declare function buildStructuredQuery(input: StructuredQueryInput): {
  url: string;
  body: { structuredQuery: Record<string, unknown> };
};

export interface ProdReadArgs {
  command: string;
  positional: string[];
  where: string[];
  orderBy?: string;
  limit?: number;
  maxDocs: number;
  logFile?: string;
  hours?: number;
}
export declare function parseArgs(argv: string[]): ProdReadArgs;
