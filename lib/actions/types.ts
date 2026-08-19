export type ActionState =
  | {
      ok: boolean;
      message?: string;
      errors?: Record<string, string[]>;
      data?: Record<string, string>;
    }
  | undefined;
