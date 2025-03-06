import React, { useState, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { api } from '../services/api';

const SignUp: React.FC = () => {
  const [referralCode, setReferralCode] = useState("");
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isValidCode, setIsValidCode] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState("");

  const [debouncedReferralCode] = useDebounce(referralCode, 500);

  const validateReferralCode = useCallback(async (code: string) => {
    if (!code) {
      setIsValidCode(null);
      setValidationMessage("");
      return;
    }

    setIsValidatingCode(true);
    try {
      const response = await api.get(`/referrals/validate/${code}`);
      setIsValidCode(response.data.valid);
      setValidationMessage(response.data.message);
    } catch (error) {
      setIsValidCode(false);
      setValidationMessage("Invalid referral code");
    } finally {
      setIsValidatingCode(false);
    }
  }, []);

  const handleReferralCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setReferralCode(code);
    validateReferralCode(code);
  };

  return (
    <div className="space-y-2">
      <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700">
        Referral Code (Optional)
      </label>
      <div className="relative">
        <input
          id="referralCode"
          type="text"
          value={referralCode}
          onChange={handleReferralCodeChange}
          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
            isValidatingCode ? 'border-gray-300' :
            isValidCode === null ? 'border-gray-300' :
            isValidCode ? 'border-green-500' : 'border-red-500'
          }`}
          placeholder="Enter referral code"
          disabled={isValidatingCode}
        />
        {isValidatingCode && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>
      {validationMessage && (
        <p className={`text-sm ${
          isValidCode ? 'text-green-600' : 'text-red-600'
        }`}>
          {validationMessage}
        </p>
      )}
    </div>
  );
};

export default SignUp; 