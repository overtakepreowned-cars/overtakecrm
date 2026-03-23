import { LayoutDashboard, Users, GitMerge, CalendarCheck, BarChart3, UserCog } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/mainlogo.svg';

interface SidebarProps {
    isOpen: boolean;
    setSidebarOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setSidebarOpen }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAdmin, user, logout } = useAuth();
    const activeTab = location.pathname.substring(1) || 'dashboard';

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'contacts', label: 'Contacts', icon: Users },
        { id: 'pipeline', label: 'Pipeline', icon: GitMerge },
        { id: 'followups', label: 'Follow-ups', icon: CalendarCheck },
    ];

    if (isAdmin) {
        menuItems.push({ id: 'report', label: 'Working Report', icon: BarChart3 });
        menuItems.push({ id: 'users', label: 'Users', icon: UserCog });
    }

    const handleLogout = () => {
        logout();
        setSidebarOpen(false);
        navigate('/login');
    };

    return (
        <aside className={clsx(
            "fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col bg-[#1B1B19] border-r border-gray-800 p-6 shadow-lg transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:translate-x-0",
            isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            <div className="mb-10 mx-2 flex flex-col items-center justify-center px-4 py-5 bg-white/5 rounded-2xl shadow-lg border border-white/10">
                <img
                    src={logo}
                    alt="Overtake Logo"
                    className="h-8 w-auto object-contain"
                />
                <span className="text-[10px] text-gray-400 font-medium tracking-widest uppercase mt-3 text-center leading-tight">PRE OWNED PREMIUM LUXURY CARS</span>
                <span className="text-[10px] text-gray-500 font-bold mt-2">v1.0</span>
            </div>

            <nav className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
                <div className="mb-2 px-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Main Menu</div>
                {menuItems.map((item) => (
                    <Link
                        key={item.id}
                        to={isAdmin ? `/admin/${item.id}` : `/${item.id}`}
                        className={clsx(
                            "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                            activeTab === item.id || (item.id === 'contacts' && activeTab === 'smartlist') || (isAdmin && location.pathname.includes(`/admin/${item.id}`))
                                ? "bg-white/10 text-white shadow-md border border-white/10"
                                : "text-gray-400 hover:bg-white/5 hover:text-white"
                        )}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                    </Link>
                ))}

            </nav>

            <div className="mt-auto pt-6 border-t border-white/10 flex flex-col gap-2">
                {user && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 px-2 mb-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-bold text-white border border-white/20">
                                {user.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-white text-sm leading-tight">{user.username}</span>
                                <span className="text-[10px] font-bold uppercase text-gray-500">{user.role}</span>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 text-red-400 hover:bg-red-400/10 hover:text-red-300"
                        >
                            <Users size={18} />
                            <span>Logout</span>
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
