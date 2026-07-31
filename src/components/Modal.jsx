import React from 'react';

const Modal = ({ isOpen, onClose, onSubmit, title, children, submitText, cancelText }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-slate-200 p-6 rounded-xl w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-slate-900">{title}</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          {children}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              {cancelText || 'Cancel'}
            </button>
            <button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm"
            >
              {submitText || 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Modal;