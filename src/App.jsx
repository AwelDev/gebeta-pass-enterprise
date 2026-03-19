import React, { useState, useEffect } from 'react';
import Login from './features/auth/Login';
import UserDashboard from './features/dashboard/UserDashboard';
import AdminLayout from './features/admin/AdminLayout';
import Scanner from './features/scanner/Scanner';

function App() {
  const [view, setView] = useState('loading'); 
  const [session, setSession] = useState(null);
  const [lang, setLang] = useState('en'); 

  useEffect(() => { 
    checkRecovery(); 
    
    // Global Listeners
    const handleEscKey = (event) => { 
        if (event.key === 'Escape') { 
            if (window.api && window.api.exitFullscreen) {
                window.api.exitFullscreen(); 
            }
        } 
    };

    const handleDoubleClick = async (e) => {
        const target = e.target;
        const tag = target.tagName.toLowerCase();
        
        const isInteractive = 
            tag === 'input' || 
            tag === 'textarea' || 
            tag === 'select' || 
            target.closest('button') || 
            target.closest('.no-fullscreen'); 

        if (!isInteractive && window.api && window.api.toggleFullscreen) {
            await window.api.toggleFullscreen();
        }
    };
    
    window.addEventListener('keydown', handleEscKey);
    window.addEventListener('dblclick', handleDoubleClick);

    return () => { 
        window.removeEventListener('keydown', handleEscKey); 
        window.removeEventListener('dblclick', handleDoubleClick);
    };
  }, []);

  const checkRecovery = async () => { 
    try { 
      if (!window.api) {
          setView('login');
          return;
      }

      const savedSession = await window.api.getSessionState(); 
      if (savedSession && savedSession.active) { 
          setSession(savedSession); 
          setView('scanner'); 
      } else { 
          setView('login'); 
      } 
    } catch(e) { 
        console.error("Session recovery failed:", e);
        setView('login'); 
    } 
  };

  const handleLogin = (role) => setView(role === 'admin' ? 'admin' : 'user');
  
  const handleStartSession = (newSession) => { 
      setSession(newSession); 
      setView('scanner'); 
  };
  
  const handleEndSession = () => { 
      setSession(null); 
      setView('user'); 
  };
  
  const handleLogout = async () => { 
      try {
          await window.api.updateSettings({ type: 'current_session', value: null }); 
          
          // FIX: No window.location.reload() - this avoids the GPU Focus Bug
          // Just reset state for instant navigation
          setSession(null);
          setView('login');
          
      } catch (e) {
          console.error("Logout error", e);
          setView('login');
      }
  };

  // --- VIEW ROUTING ---

  if (view === 'loading') {
      return <div className="h-screen flex items-center justify-center font-bold text-gray-400">Loading...</div>;
  }

  if (view === 'login') {
      return <Login onLogin={handleLogin} />;
  }

  if (view === 'admin') {
      return <AdminLayout onLogout={handleLogout} />;
  }

  if (view === 'user') {
      return <UserDashboard onStartSession={handleStartSession} onLogout={handleLogout} lang={lang} setLang={setLang} />;
  }

  if (view === 'scanner') {
      return <Scanner session={session} onEndSession={handleEndSession} onGoBack={() => setView('user')} lang={lang} setLang={setLang} />;
  }

  return <div className="h-screen flex items-center justify-center text-red-500 font-bold">Error: Unknown State</div>;
}

export default App;