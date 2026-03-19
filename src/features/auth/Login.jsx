import React, { useState, useEffect, useRef } from 'react';
import { ScanBarcode, Laptop, Lock } from 'lucide-react';
import { playSound } from '../../utils/audio';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('User');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [licenseStatus, setLicenseStatus] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const checkAuth = async () => {
        const res = await window.api.checkLicense();
        setLicenseStatus(res);
        if (!res.valid) setError(res.message);
    };
    checkAuth();
    // Keep focus helper just in case, but no longer critical due to modal fix
    if (window.api && window.api.forceFocus) window.api.forceFocus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // FIX: No window.alert() here!
    if (licenseStatus && !licenseStatus.valid) { 
        setError("Activation Required: " + licenseStatus.message);
        playSound('warning');
        return; 
    }
    
    const res = await window.api.login({ username, password });
    
    if (res.success) { 
        playSound('signin'); 
        onLogin(res.role); 
    } else { 
        playSound('warning'); 
        setError(res.message); 
        setPassword(''); 
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#f4f4f4] font-sans">
      <div className="w-full max-w-[420px] p-10 bg-[#f4f4f4] rounded-[3rem] shadow-neumorph border-[1.5px] border-brandGreen animate-in fade-in zoom-in duration-300">
        <div className="flex justify-center mb-2">
            <div className="h-44 w-44 flex items-center justify-center">
                <img src="./images/logo.png" className="w-full h-full object-contain" onError={(e) => e.target.style.display='none'} />
            </div>
        </div>
        <div className="text-center mb-6">
            <h1 className="text-4xl font-black mb-2 tracking-tight">
                <span className="text-brandGreen">Gebeta</span><span className="text-brandOrange">Pass</span>
            </h1>
            <p className="text-coffee font-bold text-[10px] uppercase tracking-widest opacity-80">
                University Digital Meal Card System
            </p>
        </div>
        {licenseStatus && licenseStatus.type === 'TRIAL' && (
            <div className="mb-8 flex justify-center">
                <div className="px-5 py-1.5 bg-blue-50/40 border border-blue-100/60 rounded-full shadow-sm backdrop-blur-sm">
                    <p className="text-blue-400/80 text-[9px] font-black uppercase tracking-[0.15em] leading-none">
                        Free Trial: {licenseStatus.daysLeft} Days Left
                    </p>
                </div>
            </div>
        )}
        <div className="flex justify-center mb-8 bg-[#f4f4f4] p-2 rounded-2xl shadow-[inset_6px_6px_12px_#d1d1d1,inset_-6px_-6px_12px_#ffffff]">
            <button onClick={() => { playSound('click'); setUsername('User'); }} className={`flex-1 py-3 rounded-xl font-bold gap-2 flex items-center justify-center text-sm transition-all ${username==='User' ? 'bg-[#f4f4f4] text-brandGreen shadow-[6px_6px_12px_#d1d1d1,-6px_-6px_12px_#ffffff]' : 'text-coffee/40'}`}>
                <ScanBarcode size={20} strokeWidth={2.5}/> User
            </button>
            <button onClick={() => { playSound('click'); setUsername('Admin'); }} className={`flex-1 py-3 rounded-xl font-bold gap-2 flex items-center justify-center text-sm transition-all ${username==='Admin' ? 'bg-[#f4f4f4] text-brandOrange shadow-[6px_6px_12px_#d1d1d1,-6px_-6px_12px_#ffffff]' : 'text-coffee/40'}`}>
                <Laptop size={20} strokeWidth={2.5}/> Admin
            </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <Lock className="absolute left-5 top-4 text-coffee/30 transition-colors group-focus-within:text-brandGreen" size={22} strokeWidth={2.5}/>
            <input ref={inputRef} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-[#f4f4f4] rounded-2xl font-bold text-lg text-coffee outline-none shadow-[inset_4px_4px_8px_#d1d1d1,inset_-4px_-4px_8px_#ffffff] focus:shadow-[inset_6px_6px_12px_#d1d1d1,inset_-6px_-6px_12px_#ffffff] focus:ring-2 focus:ring-brandGreen/10" placeholder="Enter Password..." />
          </div>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-xl text-center font-bold text-xs uppercase tracking-wide border border-red-100 animate-bounce">
                {error}
            </div>
          )}
          <button type="submit" disabled={licenseStatus && !licenseStatus.valid} className="w-full bg-brandGreen text-white py-4 rounded-2xl font-black text-lg shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff] hover:bg-[#008030] hover:scale-[0.98] active:scale-[0.96] transition-all disabled:opacity-50 disabled:cursor-not-allowed">LOGIN</button>
        </form>
      </div>
      <div className="absolute bottom-6 text-coffee/20 font-bold text-[10px] uppercase tracking-[0.2em]">Powered by Gebeta Pass</div>
    </div>
  );
};

export default Login;