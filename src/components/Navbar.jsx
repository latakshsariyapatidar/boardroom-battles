import React from 'react';

const Navbar = () => {
  return (
    <nav className="navbar fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-white border-b-2 border-slate-200 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          B
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Boardroom Battles Voting System</h1>
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">IIT Dharwad</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 bg-orange-100 border border-orange-200 text-orange-800 text-xs font-bold rounded-md">
          Live System
        </span>
      </div>
    </nav>
  );
};

export default Navbar;