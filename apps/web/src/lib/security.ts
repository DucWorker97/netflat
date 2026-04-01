const STRONG_PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export const PASSWORD_REQUIREMENTS_HINT =
    'Dùng ít nhất 8 ký tự, bao gồm tối thiểu 1 chữ cái và 1 chữ số.';

export function getPasswordValidationError(password: string): string | null {
    return STRONG_PASSWORD_PATTERN.test(password) ? null : PASSWORD_REQUIREMENTS_HINT;
}
