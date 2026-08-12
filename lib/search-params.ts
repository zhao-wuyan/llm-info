export const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
export const many = (value: string | string[] | undefined) => Array.isArray(value) ? value : value ? [value] : [];
