import React, { useState, useEffect, useRef } from 'react';
// FIX: Added 'XCircle' to the imports below to prevent crash on double scan
import { Camera, Keyboard, ScanBarcode, LogOut, CheckCircle, CheckCircle2, Globe, ChevronRight, Check, AlertTriangle, ChevronLeft, Users, Utensils, UserX, XCircle } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { format } from 'date-fns';
import { playSound } from '../../utils/audio';
import { translations } from '../../utils/translations';

// --- DYNAMIC TRANSLATION ENGINE ---
const getSessionName = (type, lang) => {
    if (lang === 'am') {
        if (type === 'Breakfast') return 'ቁርስ';
        if (type === 'Lunch') return 'ምሳ';
        if (type === 'Dinner') return 'እራት';
        return 'ልዩ';
    }
    if (lang === 'or') {
        if (type === 'Breakfast') return 'Ciree';
        if (type === 'Lunch') return 'Laaqana';
        if (type === 'Dinner') return 'Irbaata';
        return 'Addaa';
    }
    return type; // English default
};

const getModalMessage = (type, lang) => {
    const sName = getSessionName(type, lang);
    
    // Amharic: Exact requested phrasing
    if (lang === 'am') return `የ ${sName} ፕሮግራም ከጨረሱ ከታች አወ የሚለውን ይጫኑ`;
    
    // Oromo: "If you finished the [Session] program, press Yes"
    if (lang === 'or') return `Yoo Sagantaa ${sName} xumurtan, Eeyyee tuqaa`;
    
    // English
    return `If you finished the ${sName} session, press Yes below`;
};

const getBtnText = (lang) => {
    if (lang === 'am') return { confirm: 'አወ', cancel: 'ይቅር' };
    if (lang === 'or') return { confirm: 'Eeyyee', cancel: 'Haqi' };
    return { confirm: 'Yes', cancel: 'Cancel' };
};

// --- CUSTOM MODAL (No Title, Just Message) ---
const EndSessionModal = ({ onConfirm, onCancel, lang, sessionType }) => {
  const msg = getModalMessage(sessionType, lang);
  const btns = getBtnText(lang);

  return (
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      {/* Container: Rounded, Green Border, Shadow */}
      <div className="bg-white w-[340px] p-6 rounded-[2.5rem] shadow-2xl border-[1.5px] border-[#00973A] relative flex flex-col gap-6 animate-in zoom-in-95 scale-100 items-center pt-10">
        
        {/* Floating Icon (Congratulation Style) */}
        <div className="absolute -top-10 bg-red-50 p-4 rounded-full border-[6px] border-white shadow-lg flex items-center justify-center">
           <CheckCircle2 size={40} className="text-[#ff0000]" strokeWidth={2.5} />
        </div>

        {/* Message Box (Pink Background) - TITLE REMOVED */}
        <div className="w-full bg-[#fff0f0] border border-[#ff0000]/10 rounded-[1.5rem] px-5 py-8 text-center shadow-inner flex items-center justify-center">
            <p className="text-sm font-black text-coffee/80 leading-relaxed">
                {msg}
            </p>
        </div>

        {/* Buttons (Gray Cancel / Green Yes) */}
        <div className="flex gap-3 w-full">
          <button 
            onClick={() => { playSound('click'); onCancel(); }} 
            className="flex-1 py-3.5 rounded-2xl font-black text-xs uppercase bg-[#f4f4f4] text-coffee/50 hover:bg-[#e0e0e0] transition-colors shadow-sm"
          >
            {btns.cancel}
          </button>
          <button 
            onClick={() => { playSound('click'); onConfirm(); }} 
            className="flex-1 py-3.5 rounded-2xl font-black text-xs uppercase bg-[#00973A] text-white shadow-lg shadow-green-900/20 hover:bg-[#007a2f] active:scale-95 transition-all"
          >
            {btns.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- UI HELPERS ---
const ScannerBtn = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`h-11 min-w-[100px] px-3 flex items-center justify-center gap-2 rounded-xl font-bold text-[10px] uppercase tracking-wide transition-all active:scale-95 shadow-md ${active ? 'bg-indigo-600 text-white shadow-indigo-500/30 border border-indigo-400' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 shadow-slate-900'}`}>
    {icon} <span className="truncate max-w-[70px]">{label}</span>
  </button>
);

const StatItem = ({ label, value, color, icon }) => (
  <div className="flex flex-col items-center justify-center px-4 py-1 rounded-lg bg-slate-800/50 min-w-[90px] border border-slate-700/50 shadow-inner">
    <div className={`text-2xl font-black ${color} leading-none mb-0.5 drop-shadow-md`}>{value}</div>
    <div className="flex items-center gap-1 opacity-70">
      {icon}
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
  </div>
);

const Scanner = ({ session, onEndSession, onGoBack, lang, setLang }) => {
  if (!session) return <div className="h-screen bg-[#0f172a] text-white flex items-center justify-center">Loading Session...</div>;

  const [date] = useState(format(new Date(), 'EEEE, MMM do'));
  const [log, setLog] = useState(null);
  const [mode, setMode] = useState('barcode');
  const [manualId, setManualId] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [stats, setStats] = useState({ total: 0, ate: 0 });
  const [photoUrl, setPhotoUrl] = useState('./images/avatar_male.png');
  const [showEndModal, setShowEndModal] = useState(false);
  
  const videoRef = useRef(null);
  const inputRef = useRef(null);
  const scanBuffer = useRef("");
  const lastScanTime = useRef(0);
  const codeReader = useRef(null);
  
  const langRef = useRef(lang);
  const sessionRef = useRef(session);
  const logRef = useRef(log);

  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { logRef.current = log; }, [log]);

  const t = translations[lang];
  const sl = {
    en: { total: 'Total', ate: 'Served', notAte: 'Remaining' },
    am: { total: 'ጠቅላላ', ate: 'የተስተናገዱ', notAte: 'ያልተስተናገዱ' },
    or: { total: 'Waligala', ate: 'Nyaatan', notAte: 'Hafan' }
  }[lang];

  const getFullLangName = () => {
    switch (lang) { case 'am': return 'አማርኛ'; case 'or': return 'Oromoo'; default: return 'English'; }
  };

  const cleanupScanner = () => {
    if (codeReader.current) {
        try { codeReader.current.reset(); codeReader.current = null; } catch(e) {}
    }
    // CRITICAL: Manual hardware release to prevent Input Freeze bug
    if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach(track => { track.stop(); stream.removeTrack(track); });
        videoRef.current.srcObject = null;
    }
  };

  // --- STATS LOGIC (RESTORED EXACTLY AS YOU HAD IT) ---
  useEffect(() => {
    const syncStats = async () => {
        try {
            const res = await window.api.getDashboardStats();
            // This is your original calculation logic. I have kept it exactly the same.
            if (res) setStats({ total: res.pop.eligible, ate: res.ate[session.mealType.toLowerCase()] || 0 });
        } catch(e) {
            console.error("Stats sync error (ignored to prevent crash)");
        }
    };
    syncStats();
    const interval = setInterval(syncStats, 3000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT') return;
      const now = Date.now();
      if (now - lastScanTime.current > 100) scanBuffer.current = "";
      lastScanTime.current = now;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (scanBuffer.current.trim().length > 0) processScan(scanBuffer.current);
        scanBuffer.current = "";
      } else if (e.key.length === 1) scanBuffer.current += e.key;
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    cleanupScanner();
    if (mode === 'camera') {
      const reader = new BrowserMultiFormatReader();
      codeReader.current = reader;
      reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (result) processScan(result.text);
      }).catch((err) => console.error("Camera Error:", err));
    }
    return () => cleanupScanner();
  }, [mode]);

  // --- CRITICAL FIX: Wrapped in try/catch to prevent White Screen ---
  const processScan = async (id) => {
    const cleanId = id.trim();
    if (!cleanId) return;
    
    // Prevent duplicate spam scanning
    const currentLog = logRef.current;
    if (currentLog && currentLog.student && currentLog.student.id === cleanId && (Date.now() - new Date(currentLog.timestamp).getTime() < 2500)) return;
    
    setManualId("");
    
    try {
        const res = await window.api.scanStudent({ studentId: cleanId, session: sessionRef.current, method: mode });
        
        // Validation check to prevent crash if res is null
        if (!res) throw new Error("Null response");

        setLog({ ...res, timestamp: Date.now() });
        
        if (res.success) {
          playSound('verified');
          setStats(prev => ({ ...prev, ate: prev.ate + 1 }));
        } else {
          const s = langRef.current === 'am' ? 'erroramh' : langRef.current === 'or' ? 'errororo' : 'erroreng';
          playSound(s);
        }

        if (res.student) {
          const photoName = res.student.photo_path || res.student.id;
          setPhotoUrl(`student-photo://${photoName}?t=${Date.now()}`);
        } else {
          setPhotoUrl('./images/not_student_avatar.png');
        }

    } catch (e) {
        console.error("Scan Error:", e);
        // Fallback log so screen doesn't stay white/empty
        setLog({ 
            success: false, 
            status: 'ERROR', 
            message: 'System Error', 
            student: { id: cleanId, full_name: "Unknown" },
            timestamp: Date.now() 
        });
        playSound('error');
    }
    
    if (mode === 'manual' && inputRef.current) inputRef.current.focus();
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    playSound('click');
    if (manualId) {
      processScan(manualId);
      setShowDone(true);
      setTimeout(() => setShowDone(false), 2000);
    }
  };

  // --- SAFE NAVIGATION HANDLERS ---
  const handleEndClick = () => {
      playSound('click');
      setShowEndModal(true); 
  };

  const confirmEndSession = async () => {
      setShowEndModal(false);
      cleanupScanner();
      try {
        const res = await window.api.endSession(session);
        if (res.success) {
          playSound('signin');
          onEndSession();
        } else {
          onEndSession(); 
        }
      } catch (err) { onEndSession(); }
  };

  const handleBack = () => {
      playSound('click');
      cleanupScanner();
      onGoBack();
  };

  const handleImageError = () => {
      // Prevents crash if image source is invalid
      setPhotoUrl('./images/avatar_male.png');
  };

  const isSuccess = log?.success;
  const glowColor = isSuccess ? 'shadow-emerald-500/20' : 'shadow-red-600/20';
  const textColor = isSuccess ? 'text-emerald-400' : 'text-red-500';
  const borderColor = isSuccess ? 'border-emerald-500/50' : 'border-red-600/50';

  return (
    <div className="h-screen flex flex-col bg-[#0f172a] text-white font-sans relative overflow-hidden">
      
      {/* CUSTOM END SESSION MODAL */}
      {showEndModal && (
        <EndSessionModal 
          onConfirm={confirmEndSession} 
          onCancel={() => setShowEndModal(false)} 
          lang={lang} 
          sessionType={session.mealType}
        />
      )}

      {/* HEADER */}
      <div className="bg-[#1e293b] px-6 h-20 flex justify-between items-center shadow-xl z-30 shrink-0 border-b border-slate-700/50">
        <div className="flex items-center gap-8">
          <div className="flex flex-col justify-center">
            <h1 className="text-xl font-black tracking-tight text-white uppercase flex items-center gap-2 drop-shadow-md">{session.mealType}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">{t.online}</p>
            </div>
          </div>
          <div className="bg-slate-800 p-1 rounded-xl flex gap-1 border border-slate-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
            <StatItem label={sl.total} value={stats.total} color="text-white" icon={<Users size={10} className="text-white"/>} />
            <div className="w-px bg-slate-700 my-1 opacity-50"></div>
            <StatItem label={sl.ate} value={stats.ate} color="text-emerald-400" icon={<Utensils size={10} className="text-emerald-400"/>} />
            <div className="w-px bg-slate-700 my-1 opacity-50"></div>
            <StatItem label={sl.notAte} value={Math.max(0, stats.total - stats.ate)} color="text-orange-400" icon={<UserX size={10} className="text-orange-400"/>} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-slate-400 font-bold text-sm capitalize tracking-tight mr-4 hidden xl:block border-r border-slate-700 pr-6 h-8 flex items-center">{date}</div>
          <button onClick={(e) => { playSound('click'); setLang(prev => prev === 'en' ? 'am' : prev === 'am' ? 'or' : 'en'); e.currentTarget.blur(); }} className="h-11 px-4 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all active:scale-95 group shadow-lg">
            <Globe size={16} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
            <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide min-w-[50px] text-center">{getFullLangName()}</span>
          </button>
          <div className="bg-slate-800 p-1 rounded-xl flex gap-1 border border-slate-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
            <ScannerBtn active={mode === 'barcode'} onClick={() => { playSound('click'); setMode('barcode'); }} icon={<ScanBarcode size={16}/>} label={t.scanner} />
            <ScannerBtn active={mode === 'camera'} onClick={() => { playSound('click'); setMode('camera'); }} icon={<Camera size={16}/>} label={t.camera} />
            <ScannerBtn active={mode === 'manual'} onClick={() => { playSound('click'); setMode('manual'); }} icon={<Keyboard size={16}/>} label={t.manual} />
          </div>
          <button onClick={handleBack} className="h-11 w-11 flex items-center justify-center bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all active:scale-95 shadow-lg"><ChevronLeft size={20} /></button>
          <button onClick={handleEndClick} className="h-11 px-6 flex items-center gap-2 bg-[#ff0000] text-white hover:bg-red-700 rounded-xl font-bold text-[10px] uppercase tracking-wide transition-all active:scale-95 shadow-lg shadow-red-900/20 whitespace-nowrap border border-red-500"><LogOut size={16} /> {t.end}</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 p-8 flex flex-col items-center justify-center relative z-10">
          <div className="relative w-full max-w-sm aspect-[4/3] rounded-[2rem] overflow-hidden border-[3px] border-slate-700/50 bg-slate-800/30 flex flex-col items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] mb-8 group transition-all backdrop-blur-sm">
            {mode === 'camera' && <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" />}
            {mode === 'barcode' && (
              <div className="text-center p-8 animate-in fade-in z-10">
                <div className="bg-indigo-500/10 p-6 rounded-full inline-block mb-4 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.15)]"><ScanBarcode size={64} className="text-indigo-400 animate-pulse" /></div>
                <h2 className="text-xl font-black text-slate-300 tracking-wide">{t.ready}</h2>
                <p className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-widest">Listening...</p>
              </div>
            )}
            {mode === 'manual' && (
              <div className="w-full px-8 relative animate-in fade-in slide-in-from-bottom-4 z-10">
                {showDone && <div className="absolute -top-14 left-0 right-0 flex justify-center animate-bounce"><span className="bg-emerald-500 text-white px-4 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-lg"><Check size={12}/> Submitted</span></div>}
                <h3 className="text-center text-slate-400 font-bold mb-3 uppercase tracking-widest text-[10px]">Manual Entry</h3>
                <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
                  <input ref={inputRef} type="text" value={manualId} onChange={e => setManualId(e.target.value)} className="w-full bg-slate-900/80 border border-slate-600 rounded-xl px-4 py-3 text-lg focus:border-indigo-500 outline-none text-center font-mono font-bold tracking-widest text-white placeholder-slate-600 transition-colors shadow-inner" placeholder="e.g. UGR/1234/12" autoFocus />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-black text-white shadow-lg shadow-indigo-600/30 text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">{t.go} <ChevronRight size={16}/></button>
                </form>
              </div>
            )}
            {(mode === 'camera' || mode === 'barcode') && <div className="absolute inset-0 border-[20px] border-slate-900/20 pointer-events-none rounded-[2rem]"></div>}
          </div>
          {log && (
            <div key={log.timestamp} className={`w-full max-w-sm p-5 rounded-3xl shadow-2xl border-l-[6px] flex items-center gap-5 animate-in slide-in-from-bottom-4 duration-300 backdrop-blur-md bg-slate-800/90 ${borderColor}`}>
              {/* FIX: XCircle will now render correctly instead of crashing */}
              <div className={`p-3 rounded-full shrink-0 shadow-lg bg-slate-900/80 ${textColor}`}>{log.success ? <CheckCircle size={28} /> : log.status === 'DOUBLE' ? <XCircle size={28} /> : <AlertTriangle size={28} />}</div>
              <div className="overflow-hidden"><div className={`text-lg font-black truncate tracking-tight ${textColor}`}>{log.message}</div><div className="text-xs font-mono text-slate-400 mt-0.5 flex gap-2 items-center opacity-80"><span>ID:</span><span className="text-slate-200 font-bold tracking-wider">{log.student ? log.student.id : manualId || '---'}</span></div></div>
            </div>
          )}
        </div>
        <div className="relative w-[2px] h-3/4 self-center bg-slate-800/50 rounded-full overflow-visible"><div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/50 to-transparent"></div><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-16 bg-indigo-500 rounded-full blur-[2px] opacity-70"></div></div>
        <div className="w-1/2 bg-[#0f172a] flex flex-col items-center justify-center p-6 relative overflow-hidden pt-12">
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
          <div className="relative z-10 w-full flex flex-col items-center justify-center h-full pb-16">
            {log ? (
              <div className="animate-in zoom-in duration-300 flex flex-col items-center justify-center w-full">
                <div className="relative group w-full max-w-[350px] aspect-[4/5] flex-shrink-0 flex flex-col items-center justify-center">
                  <div className={`absolute inset-6 rounded-[2.5rem] blur-2xl opacity-20 transition-colors duration-500 ${isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <div className={`relative w-full h-full rounded-[2.5rem] p-1.5 bg-white shadow-[20px_20px_40px_#0b111e,-20px_-20px_40px_#131d36] transition-colors duration-300 border ${borderColor}`}>
                    <div className="w-full h-full rounded-[2.2rem] overflow-hidden bg-white relative"><img key={log.timestamp} src={photoUrl} className="w-full h-full object-cover object-top bg-white" onError={handleImageError} alt="Student" /></div>
                  </div>
                  <div className={`absolute -bottom-4 z-20 px-8 py-2 rounded-xl font-black text-white shadow-xl ${glowColor} tracking-[0.15em] text-sm uppercase transform transition-transform group-hover:scale-105 border border-white/10 ${isSuccess ? 'bg-emerald-600' : 'bg-red-600'}`}>{log.success ? 'VERIFIED' : log.message}</div>
                </div>
                <div className={`w-full max-w-md px-6 py-3 rounded-[1.5rem] shadow-[10px_10px_30px_#0b111e,-10px_-10px_30px_#131d36] mt-6 text-center relative flex flex-col items-center gap-1 bg-slate-800 border ${borderColor}`}>
                  <h2 className={`text-2xl font-black tracking-tight leading-none truncate px-2 w-full ${textColor} drop-shadow-md relative z-20`}>{log.student ? log.student.full_name : "Unknown"}</h2>
                  <div className="w-full border-b-2 border-dotted border-slate-700/50 my-3 relative z-10"></div>
                  <div className="font-mono text-base font-bold text-slate-300 tracking-wide relative z-10"><span>ID NO: {log.student ? log.student.id : "---"}</span><span className="mx-4 text-slate-600">|</span><span>Dept: {log.student ? (log.student.department || "---") : "---"}</span></div>
                </div>
              </div>
            ) : (
              <div className="opacity-20 text-center flex flex-col items-center animate-pulse">
                <div className="h-[400px] w-[300px] bg-slate-800 rounded-[3rem] mb-8 shadow-[inset_10px_10px_20px_#0b111e,inset_-10px_-10px_20px_#1e293b] border-2 border-slate-700/50 border-dashed flex items-center justify-center"><ScanBarcode size={80} className="text-slate-500" /></div>
                <h2 className="text-3xl font-black text-slate-600 tracking-tight drop-shadow-md">{t.waiting}</h2>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scanner;