export type ActionFailure = {
    ok: false;
    error: string;
    fieldErrors?: Partial<Record<string, string[]>>;
};

export type ActionSuccess<T extends object = object> = { ok: true } & T;

export type ActionResult<T extends object = object> = ActionSuccess<T> | ActionFailure;

export const genericAuthError = "Não foi possível entrar. Verifique os dados e tente de novo.";
export const genericSaveError = "Não foi possível salvar. Tente de novo.";
export const genericDeleteError = "Não foi possível excluir. Tente de novo.";

export function fromZodError(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): ActionFailure {
    const fieldErrors: Record<string, string[]> = {};

    for (const issue of error.issues) {
        const key = typeof issue.path[0] === "string" ? issue.path[0] : "form";
        fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }

    return {
        ok: false,
        error: error.issues[0]?.message ?? genericSaveError,
        fieldErrors,
    };
}
