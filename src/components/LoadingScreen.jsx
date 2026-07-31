import React from 'react';

const LoadingScreen = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className="text-center bg-white border-2 border-slate-200 p-8 rounded-xl max-w-sm w-full shadow-2xl">
        <div className="w-14 h-14 mx-auto bg-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-sm">
          B
        </div>

        <h2 className="text-xl font-extrabold text-slate-900 mb-2">
          Boardroom Battles
        </h2>

        <div className="w-48 mx-auto bg-slate-200 rounded-full h-2 overflow-hidden my-4">
          <div className="h-full bg-orange-600 rounded-full w-full animate-pulse"></div>
        </div>

        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          {message || 'Loading...'}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;