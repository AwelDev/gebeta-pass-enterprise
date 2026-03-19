import React, { useState, useEffect } from "react";
import {
  Settings,
  Key,
  Lock,
  CheckCircle,
  Shield,
  UserCog,
  QrCode,
  X,
  Phone,
} from "lucide-react";
import { Card } from "../components/DesignSystem";
import { useAdmin } from "../context/AdminContext";

const SecurityView = () => {
  const { notify } = useAdmin();

  const [modalMode, setModalMode] = useState(null);

  return (
    <div className="w-full h-full overflow-hidden animate-in fade-in duration-500">
      {" "}
      <Card title="Account Settings" icon={Settings} theme="blue">
        {" "}
        <div className="flex flex-col h-full overflow-y-auto scrollbar-thin px-2 pb-6">
          {" "}
          <div className="flex-1 flex flex-col justify-center">
            {" "}
            <div className="grid grid-cols-2 gap-8 w-full max-w-4xl mx-auto">
              {" "}
              {/* ADMIN CARD */}
              <div className="bg-white/80 border-[0.75px] border-blue-300 rounded-[2rem] p-8 flex flex-col items-center text-center shadow-sm hover:border-blue-500 hover:shadow-md transition-all duration-300 group">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center border-[0.75px] border-blue-200 mb-6 group-hover:scale-110 transition-transform">
                  <UserCog
                    size={40}
                    className="text-blue-600"
                    strokeWidth={1.5}
                  />
                </div>

                <h3 className="text-2xl font-black text-blue-900 font-display mb-1">
                  Admin
                </h3>

                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-8">
                  Full System Control
                </p>

                {/* CHANGE PASSWORD */}
                <button
                  onClick={() => setModalMode("admin")}
                  className="w-fit mx-auto px-8 py-4 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Key size={16} strokeWidth={2.5} />
                  Change Password
                </button>

                {/* CHANGE CONTACT */}
                <button
                  onClick={() => setModalMode("phone")}
                  className="w-fit mx-auto mt-3 px-8 py-4 rounded-xl bg-blue-50 text-blue-700 font-black text-xs uppercase tracking-widest border border-blue-200 shadow-sm hover:bg-blue-100 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Phone size={16} strokeWidth={2.5} />
                  Change Contact
                </button>
              </div>{" "}
              {/* USER CARD */}
              <div className="bg-white/80 border-[0.75px] border-emerald-300 rounded-[2rem] p-8 flex flex-col items-center text-center shadow-sm hover:border-emerald-500 hover:shadow-md transition-all duration-300 group">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center border-[0.75px] border-emerald-200 mb-6 group-hover:scale-110 transition-transform">
                  <QrCode
                    size={40}
                    className="text-emerald-600"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-xl font-black text-emerald-900 font-display mb-1">
                  Student ID Scanning Staff
                </h3>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide mb-8 max-w-[200px] leading-tight">
                  Scan student IDs to verify and allow meal access.
                </p>
                <button
                  onClick={() => setModalMode("user")}
                  className="w-full py-4 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Key size={14} strokeWidth={3} /> Change Password
                </button>
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </Card>{" "}
      {modalMode && (
        <PasswordModal
          role={modalMode}
          onClose={() => setModalMode(null)}
          showNotify={notify}
        />
      )}{" "}
    </div>
  );
};

const PasswordModal = ({ role, onClose, showNotify }) => {
  const [step, setStep] = useState(1);
  const [passwords, setPasswords] = useState({ old: "", new: "", confirm: "" });
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const isAdm = role === "admin";
  const isPhone = role === "phone";

  const themeColor = isAdm ? "text-blue-600" : "text-emerald-600";
  const themeBg = isAdm ? "bg-blue-600" : "bg-emerald-600";
  const themeBorder = isAdm
    ? "border-blue-200 focus:border-blue-500"
    : "border-emerald-200 focus:border-emerald-500";

  const handleVerify = async (e) => {
    e.preventDefault();
    const isValid = await window.api.verifyPassword({
      role,
      password: passwords.old,
    });

    if (isValid) {
      setStep(2);
      setError("");
    } else {
      setError("Incorrect Password");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (passwords.new !== passwords.confirm)
      return setError("Passwords do not match");

    if (passwords.new.length < 3) return setError("Password too short");

    await window.api.updateSettings({
      type: "password",
      user: role,
      newPass: passwords.new,
    });

    showNotify("success", "Password Updated!");
    onClose();
  };

  const handlePhoneSave = async (e) => {
    e.preventDefault();

    if (!phone || phone.length < 5) return setError("Invalid phone number");

    await window.api.updateAdminPhone(phone);
    showNotify("success", "Contact Updated!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-coffee/20 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in">
      {" "}
      <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm relative animate-in zoom-in-95 border-[4px] border-white">
        {" "}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>{" "}
        <div className="text-center mb-6">
          <div
            className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              isAdm ? "bg-blue-50" : "bg-emerald-50"
            }`}
          >
            <Shield size={24} className={themeColor} />
          </div>

          <h3 className="text-xl font-black text-coffee uppercase font-display">
            {isPhone ? "Admin Contact" : `${role} Password`}
          </h3>

          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {isPhone ? "Update Contact" : `Step ${step} of 2`}
          </p>
        </div>{" "}
        <form
          onSubmit={
            isPhone ? handlePhoneSave : step === 1 ? handleVerify : handleUpdate
          }
          className="space-y-4"
        >
          {" "}
          {isPhone ? (
            <div className="relative">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border-[0.75px] border-blue-200 focus:border-blue-500 text-center"
                placeholder="Enter Contact Phone"
                autoFocus
              />
            </div>
          ) : step === 1 ? (
            <div className="relative">
              <Lock
                className="absolute left-4 top-3.5 text-gray-400"
                size={16}
              />
              <input
                type="password"
                value={passwords.old}
                onChange={(e) =>
                  setPasswords({ ...passwords, old: e.target.value })
                }
                className={`w-full pl-10 p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border-[0.75px] transition-all ${themeBorder}`}
                placeholder="Current Password"
                autoFocus
              />
            </div>
          ) : (
            <>
              <div className="relative">
                <Key
                  className="absolute left-4 top-3.5 text-gray-400"
                  size={16}
                />
                <input
                  type="password"
                  value={passwords.new}
                  onChange={(e) =>
                    setPasswords({ ...passwords, new: e.target.value })
                  }
                  className={`w-full pl-10 p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border-[0.75px] transition-all ${themeBorder}`}
                  placeholder="New Password"
                  autoFocus
                />
              </div>
              <div className="relative">
                <CheckCircle
                  className="absolute left-4 top-3.5 text-gray-400"
                  size={16}
                />
                <input
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirm: e.target.value })
                  }
                  className={`w-full pl-10 p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border-[0.75px] transition-all ${themeBorder}`}
                  placeholder="Confirm Password"
                />
              </div>
            </>
          )}{" "}
          {error && (
            <div className="text-red-500 font-bold text-[10px] text-center">
              {error}
            </div>
          )}{" "}
          <button
            type="submit"
            className={`w-full py-3.5 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-95 transition-all ${themeBg}`}
          >
            {isPhone
              ? "Save Contact"
              : step === 1
                ? "Verify Identity"
                : "Update Password"}
          </button>{" "}
        </form>{" "}
      </div>{" "}
    </div>
  );
};

export default SecurityView;
