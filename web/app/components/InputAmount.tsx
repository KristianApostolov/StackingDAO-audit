import React from 'react';

interface InputAmountProps {
  balance: string;
  token: string;
  inputName: string;
  inputId: string;
  inputValue: string;
  inputLabel: string;
  onInputChange: (event: any) => void;
  onClickMax: (event: any) => void;
}

export const InputAmount = React.forwardRef<HTMLInputElement, InputAmountProps>(
  (
    { balance, token, inputName, inputId, inputValue, inputLabel, onInputChange, onClickMax },
    ref
  ) => {
    return (
      <div className="relative flex flex-col">
        <span className="text-xs text-left text-gray-600">
          Available amount {balance} {token}
        </span>
        <div className="inline-flex items-center w-full min-w-0 mt-2 mb-2 border border-gray-300 rounded-md">
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoCorrect="off"
            pattern="^[0-9]*[.,]?[0-9]*$"
            placeholder="0.0"
            name={inputName}
            id={inputId}
            aria-label={inputLabel}
            className="flex-1 min-w-0 px-3 mr-2 border-0 rounded-md sm:text-sm focus:outline-none focus:ring-0"
            value={inputValue}
            onChange={onInputChange}
            ref={ref}
            autoFocus={true}
          />
          <div className="ml-auto mr-2 text-sm shrink-0 pl-3 pt-3 pb-3">
            <div className="flex items-center min-w-0">
              <span className="text-gray-400 sm:text-sm">{token}</span>
              <div className="w-px h-3 mx-2 bg-gray-400"></div>
              <button
                type="button"
                onClick={onClickMax}
                className="p-1 text-xs font-semibold text-gray-600 button-ststx rounded-md focus:outline-none focus:ring-2 focus:ring-offset-0"
              >
                Max.
              </button>
            </div>
          </div>
          <label className="sr-only">{inputLabel}</label>
        </div>
      </div>
    );
  }
);
