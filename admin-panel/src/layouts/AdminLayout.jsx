import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  ShieldCheck, 
  ClipboardList, 
  Star, 
  CreditCard, 
  MessageSquareWarning, 
  Tags, 
  MapPin,
  Search, 
  Bell, 
  Settings 
} from 'lucide-react';

function AdminLayout() {
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <LayoutDashboard size={20} />
          </div>
          <h2>ServiceHub</h2>
        </div>

        <nav className="nav-menu">
          <NavLink to="/" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <LayoutDashboard className="nav-icon" /> Dashboard
          </NavLink>
          <NavLink to="/users" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Users className="nav-icon" /> Users
          </NavLink>
          <NavLink to="/professionals" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <UserCog className="nav-icon" /> Professionals
          </NavLink>
          <NavLink to="/verification" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <ShieldCheck className="nav-icon" /> Verification
          </NavLink>
          <NavLink to="/requests" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <ClipboardList className="nav-icon" /> Service Requests
          </NavLink>
          <NavLink to="/reviews" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Star className="nav-icon" /> Reviews
          </NavLink>
          <NavLink to="/payments" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <CreditCard className="nav-icon" /> Payments
          </NavLink>
          <NavLink to="/complaints" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <MessageSquareWarning className="nav-icon" /> Complaints
          </NavLink>
          <NavLink to="/categories" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Tags className="nav-icon" /> Services & Pricing
          </NavLink>
          <NavLink to="/pricing" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <MapPin className="nav-icon" /> Location & Category Pricing
          </NavLink>
        </nav>
      </aside>

      <main className="main-wrapper">
        <header className="topbar">
          <div className="topbar-search">
            <Search size={18} className="nav-icon" style={{ color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search..." />
          </div>
          <div className="topbar-actions">
            <div style={{ position: "relative" }} ref={dropdownRef}>
              <button 
                className="action-btn" 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (unreadCount > 0 && !showNotifications) {
                    markAllRead();
                  }
                }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <h3>Notifications</h3>
                    {notifications.length > 0 && (
                      <button onClick={markAllRead}>Mark all as read</button>
                    )}
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">No new notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`}>
                          <div className="notification-title">{n.title}</div>
                          <div className="notification-message">{n.message}</div>
                          <div className="notification-time">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="action-btn"><Settings size={20} /></button>
            <div className="avatar"></div>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;