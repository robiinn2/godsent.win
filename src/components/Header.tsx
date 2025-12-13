import { LogOut, Circle } from "lucide-react";
import { NavLink } from "./NavLink";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "./NotificationBell";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  onLogoClick?: () => void;
}

const Header = ({ onLogoClick }: HeaderProps = {}) => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadPfp();
    }
  }, [user]);

  const loadPfp = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('pfp_url')
      .eq('id', user!.id)
      .single();

    if (data) {
      setPfpUrl(data.pfp_url);
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (onLogoClick) {
      e.preventDefault();
      onLogoClick();
    }
  };

  return (
    <header className="forum-header border-b-2 border-primary">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <NavLink 
            to={user ? "/forum" : "/"} 
            className="text-xl font-bold tracking-tight text-white"
            onClick={handleLogoClick}
          >
            Godsent.win
          </NavLink>
          
          <nav className="flex items-center gap-3 md:gap-5">
            {user ? (
              <>
                <NotificationBell />
                
                <NavLink to="/forum" className="text-white/90 hover:text-white text-sm transition-colors">
                  Forum
                </NavLink>
                
                <NavLink to="/support" className="text-white/90 hover:text-white text-sm transition-colors">
                  Support
                </NavLink>
                
                {isAdmin && (
                  <NavLink 
                    to="/admin" 
                    className="text-white/90 hover:text-white text-sm transition-colors"
                  >
                    Admin
                  </NavLink>
                )}
                
                {/* Profile Icon */}
                <button
                  onClick={() => navigate('/profile')}
                  className="w-7 h-7 overflow-hidden border border-white/30 hover:border-white transition-colors"
                >
                  <img 
                    src={pfpUrl || '/default-pfp.png'} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                </button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={signOut}
                  className="text-white/80 hover:text-white hover:bg-white/10 h-7 w-7"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <NavLink 
                  to="/register" 
                  className="text-white/90 hover:text-white text-sm transition-colors"
                >
                  Register
                </NavLink>
                
                <NavLink 
                  to="/login" 
                  className="text-white/90 hover:text-white text-sm transition-colors"
                >
                  Login
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
