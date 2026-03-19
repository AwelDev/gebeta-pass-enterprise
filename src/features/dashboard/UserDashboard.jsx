import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Lock, Unlock, AlertTriangle, BookOpen, PhoneCall, Maximize2, Minimize2, X, Phone, Globe, Mail, User, Star } from 'lucide-react';
import { playSound } from '../../utils/audio';
import { translations } from '../../utils/translations';
import { NeuBtn } from '../../ui/components';

const MEALS = [ 
    { id: 'Breakfast', img: './images/breakfast.png', labels: { en: "Breakfast", am: "ቁርስ", or: "Ciree" } }, 
    { id: 'Lunch', img: './images/lunch.png', labels: { en: "Lunch", am: "ምሳ", or: "Laaqana" } }, 
    { id: 'Dinner', img: './images/dinner.png', labels: { en: "Dinner", am: "እራት", or: "Irbaata" } }, 
    { id: 'Special', img: './images/snack.png', labels: { en: "Special Event", am: "ልዩ ዝግጅት", or: "Qophii Addaa" } } 
];

const STATUS_STYLES = { 
    active: { ring: "ring-[6px] ring-brandOrange/40", iconBg: "bg-brandOrange", Icon: AlertTriangle, iconProps: { fill: "currentColor", className: "text-white" } }, 
    ended: { ring: "ring-[6px] ring-red-500/20", iconBg: "bg-[#ff0000]", Icon: Lock, iconProps: { className: "text-white" } }, 
    new: { ring: "hover:ring-[6px] ring-brandGreen/20", iconBg: "bg-brandGreen", Icon: Unlock, iconProps: {} } 
};

const POPUP_TEXTS = {
    en: { msg: "This session has ended.\nDo you want to continue?", yes: "Yes, Resume", cancel: "No, Cancel" },
    am: { msg: "ይህ ክፍለ ጊዜ ተጠናቋል!\nመቀጠል ይፈልጋሉ?", yes: "አወ", cancel: "ይቅር" },
    or: { msg: "Turtiin kun dhumateera.\nItti fufuu barbaadduu?", yes: "Eeyyee", cancel: "Haqi" }
};

const UserDashboard = ({ onStartSession, onLogout, lang, setLang }) => {
  const [date] = useState(format(new Date(), 'EEEE, MMM do'));
  const [statuses, setStatuses] = useState({ Breakfast: 'new', Lunch: 'new', Dinner: 'new', Special: 'new' });
  const [resumeModal, setResumeModal] = useState(null);
  const [specialModal, setSpecialModal] = useState(false); // <--- NEW STATE
  const [showContact, setShowContact] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const t = translations[lang];
  const popupTxt = POPUP_TEXTS[lang]; 

  useEffect(() => { loadStatuses(); setInterval(loadStatuses, 5000); }, []);
  const loadStatuses = async () => setStatuses(await window.api.getDailyStatus());
  
  const getLangName = () => ({ en: 'English', am: 'አማርኛ', or: 'Afaan Oromoo' }[lang]);
  const isAm = lang === 'am';
  
  const toggleLang = () => { playSound('click'); setLang(l => l === 'en' ? 'am' : l === 'am' ? 'or' : 'en'); };
  const toggleFull = async () => { playSound('click'); setIsFullscreen(await window.api.toggleFullscreen()); };
  
  const handleMealClick = (type) => { 
      playSound('click'); 
      const status = statuses[type]; 
      
      if (status === 'active') return initSession(type, type === 'Special', true); 
      if (status === 'ended') return setResumeModal(type); 
      
      // FIXED: REPLACED NATIVE CONFIRM WITH MODAL STATE
      if (type === 'Special') {
          setSpecialModal(true);
          return;
      }
      
      initSession(type, false, false); 
  };

  const handleResumeConfirm = () => { 
      playSound('click'); 
      initSession(resumeModal, resumeModal === 'Special', true); 
      setResumeModal(null); 
  };

  const handleSpecialConfirm = () => {
      playSound('click');
      initSession('Special', true, false);
      setSpecialModal(false);
  };

  const initSession = async (mealType, isSpecial, isResume) => { 
      const res = await window.api.startSession({ mealType, date, isSpecial, resume: isResume }); 
      if (res.success) onStartSession(res.session); 
  };

  return (
    <div className="h-screen flex flex-col bg-[#f4f4f4] relative overflow-hidden font-sans select-none text-coffee">
      <div className="px-8 flex justify-between items-center bg-[#f4f4f4] z-30 shrink-0 border-b-[1.5px] border-coffee/10 h-24 shadow-sm">
        <div className="flex items-center gap-6">
            <div className="h-20 w-20 flex items-center justify-center">
                <img src="/images/logo.png" alt="Logo" className="h-full w-full object-contain" onError={(e) => e.target.style.display='none'} />
            </div>
            <div className="flex flex-col justify-center">
                <h2 className="text-2xl font-black tracking-tight leading-none mb-1 text-coffee"><span className="text-brandGreen">Gebeta</span><span className="text-brandOrange">Pass</span></h2>
                <div className="flex items-center gap-3">
                    <p className="text-xs font-bold text-coffee tracking-wide capitalize opacity-90">University Digital Meal Card System</p>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brandGreen/10 border border-brandGreen/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-brandGreen animate-pulse"></div>
                        <span className="text-[10px] font-bold text-brandGreen capitalize tracking-wide">Online</span>
                    </div>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="text-coffee font-black text-sm capitalize tracking-tight mr-4 hidden xl:block">{date}</div>
            <NeuBtn onClick={toggleLang}><Globe size={18} className="text-brandGreen shrink-0" /><span className={`font-bold text-coffee truncate capitalize ${isAm ? 'text-sm' : 'text-xs'}`}>{getLangName()}</span></NeuBtn>
            <NeuBtn onClick={() => { playSound('click'); setShowTutorial(true); }}><BookOpen size={18} className="text-brandOrange shrink-0" /><span className={`font-bold text-coffee capitalize tracking-wide truncate ${isAm ? 'text-sm' : 'text-xs'}`}>{t.tutorial}</span></NeuBtn>
            <NeuBtn onClick={() => { playSound('click'); setShowContact(true); }}><PhoneCall size={18} className="text-brandGreen shrink-0" /><span className={`font-bold text-coffee capitalize tracking-wide truncate ${isAm ? 'text-sm' : 'text-xs'}`}>{t.help}</span></NeuBtn>
            <NeuBtn onClick={toggleFull} width="w-14">{isFullscreen ? <Minimize2 size={20} className="text-coffee"/> : <Maximize2 size={20} className="text-coffee"/>}</NeuBtn>
            <button onClick={() => { playSound('signin'); onLogout(); }} className={`w-28 h-11 flex items-center justify-center rounded-2xl bg-red-600 text-white font-black capitalize tracking-wide shadow-lg hover:bg-red-700 active:scale-95 transition-all duration-200 ml-3 ${isAm ? 'text-sm' : 'text-xs'}`}>{t.logout}</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 bg-[#f4f4f4] overflow-hidden min-h-0">
          <div className="grid grid-cols-2 gap-8 w-full max-w-3xl content-center justify-items-center">
              {MEALS.map((meal) => (
                  <MealCard key={meal.id} image={meal.img} status={statuses[meal.id]} label={meal.labels[lang]} onClick={() => handleMealClick(meal.id)} isAm={lang === 'am'} />
              ))}
          </div>
      </div>

      {resumeModal && (
          <Modal 
            icon={<Lock />} 
            onClose={() => setResumeModal(null)} 
            onAction={handleResumeConfirm} 
            content={<div className="text-center space-y-1">{popupTxt.msg.split('\n').map((line, i) => <p key={i} className={`text-coffee leading-tight ${i === 0 ? 'text-lg font-black opacity-90' : 'text-sm font-bold opacity-60'}`}>{line}</p>)}</div>}
            actionText={popupTxt.yes}
            cancelText={popupTxt.cancel}
          />
      )}

      {/* NEW: SPECIAL SESSION CONFIRMATION MODAL */}
      {specialModal && (
          <Modal 
            icon={<Star />} 
            onClose={() => setSpecialModal(false)} 
            onAction={handleSpecialConfirm} 
            content={<div className="text-center"><p className="text-lg font-black opacity-90 text-coffee">Start Special Session?</p><p className="text-sm font-bold opacity-60 text-coffee mt-1">This is for events/holidays.</p></div>}
            actionText="Start"
            cancelText="Cancel"
          />
      )}

      {showContact && <ContactModal onClose={() => setShowContact(false)} t={t} />}
      {showTutorial && <VideoModal onClose={() => setShowTutorial(false)} />}
    </div>
  );
};

const MealCard = ({ image, status, onClick, label, isAm }) => { 
    const { ring, iconBg, Icon, iconProps } = STATUS_STYLES[status] || STATUS_STYLES.new; 
    const fontSize = isAm ? 'text-[13px]' : 'text-[11px]'; 
    return (
        <button onClick={onClick} className={`relative w-full aspect-[16/10] rounded-[2.5rem] overflow-hidden bg-[#f4f4f4] border-[4px] border-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] hover:shadow-2xl active:scale-[0.98] transition-all duration-300 group isolate z-0 ${ring}`} style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>
            <div className="absolute top-5 right-5 z-20 transition-transform group-hover:scale-110 drop-shadow-md">
                <div className={`${iconBg} p-2 rounded-full text-white shadow-lg border-[3px] border-white`}>
                    <Icon size={18} {...iconProps} />
                </div>
            </div>
            <div className="absolute inset-0 z-0">
                <img src={image} alt="meal" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 transform-gpu" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 w-auto">
                <div className="px-6 py-2 bg-[#f4f4f4]/85 backdrop-blur-md rounded-t-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.1)] border-t border-x border-white/50 flex items-center justify-center gap-2 group-hover:bg-white/95 transition-all duration-300">
                    <span className={`text-coffee font-black uppercase tracking-[0.15em] ${fontSize}`}>{label}</span>
                </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/10 to-transparent pointer-events-none z-10"></div>
        </button>
    ); 
};

const Modal = ({ icon, onClose, onAction, content, actionText, cancelText }) => (
    <div className="absolute inset-0 bg-coffee/20 backdrop-blur-[6px] flex items-center justify-center z-50 animate-in fade-in duration-300 p-4">
        <div className="bg-white w-[380px] p-6 rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border-[0.75pt] border-[#004d1a] relative flex flex-col gap-5 animate-in zoom-in-95 spring-bounce duration-300">
            <div className="flex justify-center -mt-2">
                <div className="bg-red-50 p-4 rounded-full border-[3px] border-white shadow-[0_8px_16px_-4px_rgba(255,0,0,0.1)]">
                    {React.cloneElement(icon, { size: 48, strokeWidth: 2.5, className: "text-[#ff0000] drop-shadow-sm" })}
                </div>
            </div>
            <div className="bg-[#fff0f0] border-2 border-[#ff0000]/10 rounded-[1.5rem] px-5 py-6 flex flex-col items-center justify-center min-h-[80px]">
                {content}
            </div>
            <div className="flex gap-3 mt-1">
                <button onClick={() => { playSound('click'); onClose(); }} className="flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-wider bg-gray-100 text-coffee/60 hover:bg-gray-200 border-2 border-transparent hover:border-gray-300 transition-all active:scale-95">
                    {cancelText}
                </button>
                <button onClick={onAction} className="flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-wider bg-brandGreen text-white shadow-[0_8px_16px_-4px_rgba(0,151,58,0.3)] hover:bg-[#008030] hover:shadow-[0_12px_20px_-5px_rgba(0,151,58,0.4)] hover:-translate-y-0.5 transition-all active:scale-95 active:translate-y-0">
                    {actionText}
                </button>
            </div>
        </div>
    </div>
);

const ContactModal = ({ onClose, t }) => (<div className="absolute inset-0 bg-coffee/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in"><div className="bg-[#f4f4f4] p-10 rounded-[3rem] shadow-2xl max-w-sm w-full relative border border-white"><button onClick={() => { playSound('click'); onClose(); }} className="absolute top-6 right-6 bg-[#f4f4f4] p-2 rounded-full hover:bg-gray-200 transition-colors shadow-sm"><X size={20} className="text-coffee"/></button><div className="flex flex-col items-center text-center"><div className="p-1 rounded-full border-2 border-brandGreen/20 mb-6 shadow-md"><img src="/images/contact_photo.jpg" alt="Dev" className="h-24 w-24 rounded-full object-cover" onError={(e) => e.target.src='https://via.placeholder.com/150'}/></div><h2 className="text-2xl font-black text-coffee">{t.help}</h2><p className="text-brandGreen font-bold mb-8 text-[10px] capitalize tracking-widest">Gebeta Pass Support</p><div className="w-full space-y-3"><div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-coffee/5 shadow-sm"><div className="bg-[#f4f4f4] p-2 rounded-full text-brandGreen shrink-0"><User size={18}/></div><div className="flex flex-col items-start overflow-hidden"><span className="text-[9px] font-black text-coffee/40 uppercase tracking-widest">Admin</span><span className="font-bold text-sm text-coffee tracking-wide">Awel</span></div></div><div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-coffee/5 shadow-sm"><div className="bg-[#f4f4f4] p-2 rounded-full text-brandGreen shrink-0"><Phone size={18}/></div><div className="flex flex-col items-start overflow-hidden"><span className="text-[9px] font-black text-coffee/40 uppercase tracking-widest">Phone</span><span className="font-bold text-sm text-coffee tracking-wide font-mono">0935559266</span></div></div><div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-coffee/5 shadow-sm"><div className="bg-[#f4f4f4] p-2 rounded-full text-brandGreen shrink-0"><Mail size={18}/></div><div className="flex flex-col items-start overflow-hidden w-full"><span className="text-[9px] font-black text-coffee/40 uppercase tracking-widest">Email</span><span className="font-bold text-xs text-coffee tracking-wide break-all text-left">paytohabesha@gmail.com</span></div></div></div></div></div></div>);
const VideoModal = ({ onClose }) => (<div className="absolute inset-0 bg-black/95 flex items-center justify-center z-50 p-10 animate-in zoom-in"><div className="w-full max-w-5xl bg-black rounded-3xl overflow-hidden shadow-2xl relative border border-white/10"><button onClick={() => { playSound('click'); onClose(); }} className="absolute top-6 right-6 bg-white/10 text-white p-3 rounded-full hover:bg-white/30 z-20 transition-all"><X size={24}/></button><video controls className="w-full h-auto aspect-video" autoPlay><source src="/videos/tutorial.mp4" type="video/mp4" /></video></div></div>);
export default UserDashboard;