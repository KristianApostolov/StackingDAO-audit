import React, { ReactNode, Fragment, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { StyledIcon } from './StyledIcon';

type Props = {
  open: boolean;
  closeModal: () => void;
  children: ReactNode;
  title: string;
  icon?: ReactNode;
  buttonText: string;
  buttonAction: () => void;
  buttonDisabled?: boolean;
  initialFocus?: React.MutableRefObject<HTMLElement | null> | undefined;
};

export function Modal({
  open,
  children,
  title,
  icon,
  closeModal,
  buttonText,
  buttonAction,
  buttonDisabled,
  initialFocus,
}: Props) {
  const actionButtonRef = useRef(null);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 overflow-y-auto"
        initialFocus={initialFocus}
        onClose={closeModal}
      >
        <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div className="relative px-4 pt-5 pb-4 overflow-hidden text-left transition-all transform bg-white shadow-xl rounded-2xl sm:my-8 sm:w-full sm:max-w-xl sm:p-12">
              <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                <button
                  type="button"
                  className="text-gray-400 bg-white rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  onClick={closeModal}
                >
                  <span className="sr-only">Close</span>
                  <StyledIcon as="XIcon" solid={false} size={6} />
                </button>
              </div>
              <div>
                {icon ? (
                  <div className="flex items-center justify-center mx-auto rounded-full">
                    {icon}
                  </div>
                ) : null}
                <div className="mt-3 sm:mt-5">
                  <Dialog.Title
                    as="h3"
                    className="text-lg leading-6 text-center text-gray-900 font-headings"
                  >
                    {title}
                  </Dialog.Title>
                  <div className="mt-2">{children}</div>
                </div>
              </div>

              <div className="mt-5 sm:mt-8 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-full px-6 py-2 text-lg font-semibold text-white border-2 border-transparent rounded-lg focus:outline-none bg-dark-green-600 border-dark-green-600 active:bg-button-active hover:bg-button-hover disabled:bg-opacity-50 sm:col-start-2"
                  disabled={buttonDisabled}
                  onClick={buttonAction}
                  ref={actionButtonRef}
                >
                  View in explorer
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-full px-6 py-2 text-lg font-semibold bg-white border-2 rounded-lg focus:outline-none text-dark-green-600 border-dark-green-600 active:bg-button-active hover:bg-button-hover disabled:bg-opacity-50 sm:col-start-1 sm:mt-0"
                  onClick={closeModal}
                >
                  Close
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
