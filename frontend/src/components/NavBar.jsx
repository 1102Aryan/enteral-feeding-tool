import { NavLink } from "react-router-dom";
import { Activity, User, Soup, Syringe, Bell, BarChart3, Brush } from "lucide-react";

const links = [
  { to: "/bedside", label: "Bedside", icon: Activity },
  { to: "/patient", label: "Patient", icon: User },
  { to: "/feed", label: "Feed", icon: Soup },
  { to: "/insulin", label: "Insulin", icon: Syringe },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/audit", label: "Audit", icon: BarChart3 },
  { to: "/ketones", label: "Ketone", icon: Brush},
];

export default function NavBar() {
  return (
    <nav className="bg-clinical text-white md:w-48 flex md:flex-col gap-1 p-2 md:p-3 overflow-x-auto">
      <div className="hidden md:block text-xs uppercase tracking-wide text-white/60 px-2 pb-2">
        FeedGuard
      </div>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap ${
              isActive ? "bg-white/20 font-semibold" : "hover:bg-white/10"
            }`
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}