import React from 'react';
import { Modal } from './Modal';
import { LogOut } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose, onConfirm }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Partner Log Out">
      <div className="text-center space-y-4 py-2">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-200">
          <LogOut className="w-7 h-7" />
        </div>

        <div>
          <h4 className="text-base font-bold text-slate-900">Log out of your dealer account?</h4>
          <p className="text-xs text-slate-500 mt-1">
            You will go OFFLINE and stop receiving customer scrap pickup requests until you log back in.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-md"
          >
            Yes, Log Out
          </button>
        </div>
      </div>
    </Modal>
  );
};
