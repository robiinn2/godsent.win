import { Bell } from "lucide-react";
import { NavLink } from "./NavLink";
import { Button } from "./ui/button";

const Header = () => {
  return (
    <header className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <NavLink to="/" className="text-2xl font-bold tracking-tight">
            <span className="text-foreground">game</span>
            <span className="text-primary">sense</span>
          </NavLink>
          
          <nav className="flex items-center gap-6">
            <Button variant="ghost" size="icon" className="hover:bg-secondary">
              <Bell className="h-5 w-5" />
            </Button>
            
            <NavLink 
              to="/" 
              className="text-foreground hover:text-primary transition-colors"
            >
              Index
            </NavLink>
            
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
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
