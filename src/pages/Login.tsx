import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InfoCard from "@/components/InfoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/forum");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await signIn(username, password);
    setLoading(false);

    if (error) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-semibold text-foreground mb-6">Log in</h1>
        
        <div className="border border-border">
          <form onSubmit={handleSubmit}>
            {/* Username Row */}
            <div className="flex flex-col sm:flex-row border-b border-border">
              <div className="sm:w-2/5 bg-secondary/50 px-4 py-3 flex items-center">
                <Label htmlFor="username" className="text-foreground/80 text-sm">
                  Username:
                </Label>
              </div>
              <div className="sm:w-3/5 bg-card px-4 py-3">
                <Input 
                  id="username" 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-secondary border-border text-foreground h-9"
                />
              </div>
            </div>
            
            {/* Password Row */}
            <div className="flex flex-col sm:flex-row border-b border-border">
              <div className="sm:w-2/5 bg-secondary/50 px-4 py-3 flex items-center">
                <Label htmlFor="password" className="text-foreground/80 text-sm">
                  Password:
                </Label>
              </div>
              <div className="sm:w-3/5 bg-card px-4 py-3">
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary border-border text-foreground h-9"
                />
              </div>
            </div>
            
            {/* Submit Row */}
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-2/5 bg-secondary/50 px-4 py-3 hidden sm:block"></div>
              <div className="sm:w-3/5 bg-card px-4 py-4">
                <Button 
                  type="submit" 
                  className="bg-primary/80 hover:bg-primary text-primary-foreground px-6"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Log in"}
                </Button>
              </div>
            </div>
          </form>
        </div>
        
        <div className="mt-4 text-center text-muted-foreground text-sm">
          Don't have an account?{" "}
          <NavLink to="/register" className="text-link hover:text-link-hover transition-colors underline">
            Register now
          </NavLink>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Login;
