import { LogOut } from "lucide-react";
import { NavLink } from "./NavLink";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "./NotificationBell";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Header = () => {
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

  return (
    <header className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <NavLink to={user ? "/forum" : "/"} className="text-2xl font-bold tracking-tight">
            <span className="text-foreground">Godsent</span>
            <span className="text-muted-foreground">.win</span>
          </NavLink>
          
          <nav className="flex items-center gap-4 md:gap-6">
            {user ? (
              <>
                <NotificationBell />
                
                <NavLink to="/forum" className="text-foreground hover:text-primary transition-colors">
                  Forum
                </NavLink>
                
                <NavLink to="/support" className="text-foreground hover:text-primary transition-colors">
                  Support
                </NavLink>
                
                {isAdmin && (
                  <NavLink 
                    to="/admin" 
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    Admin
                  </NavLink>
                )}
                
                {/* Profile Icon */}
                <button
                  onClick={() => navigate('/profile')}
                  className="w-8 h-8 rounded-full overflow-hidden border border-border hover:border-primary transition-colors"
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
                  className="hover:bg-secondary"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <>
                <NavLink 
                  to="/register" 
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Register
                </NavLink>
                
                <NavLink 
                  to="/login" 
                  className="text-foreground hover:text-primary transition-colors"
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
