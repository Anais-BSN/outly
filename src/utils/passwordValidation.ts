// Password validation utility for Outlys
// Strict constraints:
// - Minimum 8 characters
// - At least 1 uppercase letter
// - At least 1 lowercase letter
// - At least 1 special character among: ! \" # $ % & ' ( ) * + , - . / : ; < = > ? @ [ \\ ] ^ _ ` { | } ~

export const SPECIAL_CHAR_REGEX = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

export interface PasswordCriterion {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  criteria: PasswordCriterion[];
  errorMessage: string | null;
}

export function validatePasswordSecurity(password: string): PasswordValidationResult {
  const pwd = password || '';
  
  const hasMinLength = pwd.length >= 8;
  const hasUpperCase = /[A-Z]/.test(pwd);
  const hasLowerCase = /[a-z]/.test(pwd);
  const hasSpecialChar = SPECIAL_CHAR_REGEX.test(pwd);

  const criteria: PasswordCriterion[] = [
    { id: 'length', label: '8 caractères minimum', met: hasMinLength },
    { id: 'uppercase', label: '1 majuscule minimum', met: hasUpperCase },
    { id: 'lowercase', label: '1 minuscule minimum', met: hasLowerCase },
    { id: 'special', label: '1 caractère spécial (!@#$%...)', met: hasSpecialChar },
  ];

  const isValid = hasMinLength && hasUpperCase && hasLowerCase && hasSpecialChar;

  let errorMessage: string | null = null;
  if (!isValid) {
    const missing = criteria.filter((c) => !c.met).map((c) => c.label);
    errorMessage = `Le mot de passe doit respecter : ${missing.join(', ')}.`;
  }

  return {
    isValid,
    criteria,
    errorMessage,
  };
}
