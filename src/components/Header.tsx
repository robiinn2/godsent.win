import { LogOut } from "lucide-react";
import { NavLink } from "./NavLink";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "./NotificationBell";

const Header = () => {
  const { user, signOut, isAdmin } = useAuth();

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
