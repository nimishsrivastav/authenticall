/**
 * ApiKeyInput Component
 * Secure API key input with visibility toggle
 */

import { useState } from 'react';

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidate?: (value: string) => Promise<boolean>;
  disabled?: boolean;
}

export function ApiKeyInput({
  value,
  onChange,
  onValidate,
  disabled = false,
}: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<'valid' | 'invalid' | null>(null);

  const handleValidate = async () => {
    if (!onValidate || !value) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const isValid = await onValidate(value);
      setValidationResult(isValid ? 'valid' : 'invalid');
    } catch {
      setValidationResult('invalid');
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusIcon = () => {
    if (isValidating) {
      return (
        <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
    }
    if (validationResult === 'valid') {
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    if (validationResult === 'invalid') {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="space-y-2">
      <label className="label">Gemini API Key</label>
      <div className="relative">
        <input
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setValidationResult(null);
          }}
          disabled={disabled}
          placeholder="Enter your Gemini API key"
          className="input pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {getStatusIcon()}
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Help text and validate button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Get your API key from{' '}
          <a
            href="https://makersuite.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            Google AI Studio
          </a>
        </p>
        {onValidate && value && (
          <button
            onClick={handleValidate}
            disabled={isValidating || disabled}
            className="text-xs text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50"
          >
            {isValidating ? 'Validating...' : 'Test connection'}
          </button>
        )}
      </div>

      {/* Validation feedback */}
      {validationResult === 'invalid' && (
        <p className="text-xs text-red-500 dark:text-red-400">
          Invalid API key. Please check and try again.
        </p>
      )}
      {validationResult === 'valid' && (
        <p className="text-xs text-green-500 dark:text-green-400">
          API key is valid!
        </p>
      )}
    </div>
  );
}
