import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, ArrowRight, AlertCircle, Loader2, User as UserIcon } from 'lucide-react';
import logo from '../../assets/mainlogo.svg';

export function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) return;

        setIsLoggingIn(true);
        const success = await login(username, password);
        setIsLoggingIn(false);

        if (success) {
            setError(false);
            navigate('/', { replace: true });
        } else {
            setError(true);
        }
    };

    return (
        <div className="flex h-screen w-full bg-white overflow-hidden font-sans">
            <div className="hidden lg:flex lg:w-1/2 relative bg-[#1B1B19] flex-col justify-center items-center p-12">
                <div className="relative z-10 flex flex-col items-center w-full">
                    <img
                        src={logo}
                        alt="Overtake Logo"
                        className="w-full max-w-[350px] h-auto object-contain mb-6 transform hover:scale-105 transition-transform duration-500"
                    />
                    <p className="text-gray-400 text-lg font-medium tracking-widest uppercase mt-4">CRM</p>
                    <span className="text-gray-500 text-sm font-bold mt-1">v1.0</span>
                </div>
            </div>

            {/* Right Side: Conventional Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-white">
                <div className="w-full max-w-md animate-fadeIn">
                    
                    {/* Mobile Branding (only shows on small screens) */}
                    <div className="flex lg:hidden flex-col items-center justify-center gap-4 mb-12">
                        <div className="bg-[#1B1B19] p-6 rounded-2xl w-full flex flex-col items-center justify-center shadow-lg border border-gray-800">
                            <img src={logo} alt="Overtake Logo" className="h-10 w-auto object-contain" />
                            <span className="text-[10px] text-gray-500 font-bold mt-2">v1.0</span>
                        </div>
                    </div>

                    <div className="text-left mb-10">
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Welcome Back</h2>
                        <p className="text-gray-500 text-sm font-medium">Please enter your details to sign in.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-gray-700">Username or Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                    <UserIcon size={20} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => {
                                        setUsername(e.target.value);
                                        setError(false);
                                    }}
                                    className={`w-full pl-12 pr-4 py-4 rounded-xl border ${
                                        error 
                                        ? 'border-red-300 ring-4 ring-red-50 bg-red-50/30 text-red-900 placeholder-red-300' 
                                        : 'border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 placeholder-gray-400 hover:border-gray-300 hover:bg-white'
                                    } transition-all font-semibold outline-none text-[15px]`}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-gray-700">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError(false);
                                    }}
                                    className={`w-full pl-12 pr-4 py-4 rounded-xl border ${
                                        error 
                                        ? 'border-red-300 ring-4 ring-red-50 bg-red-50/30 text-red-900 placeholder-red-300' 
                                        : 'border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 placeholder-gray-400 hover:border-gray-300 hover:bg-white'
                                    } transition-all font-semibold outline-none text-[15px]`}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-[13px] font-bold justify-center bg-red-50 py-3 rounded-xl border border-red-100 animate-fadeIn mt-1">
                                <AlertCircle size={16} />
                                Invalid username or password.
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoggingIn || !username || !password}
                            className="w-full flex items-center justify-center gap-2 mt-4 rounded-xl bg-[#1B1B19] px-6 py-4 text-[15px] font-bold text-white shadow-xl shadow-gray-200/50 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:bg-black active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed"
                        >
                            {isLoggingIn ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    Sign In to CRM
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 text-center text-gray-400 text-xs font-medium border-t border-gray-100 pt-8">
                        <p>Contact your administrator for login credentials.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
