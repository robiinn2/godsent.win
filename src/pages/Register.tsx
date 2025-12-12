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

const Register = () => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/forum");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !username || !email || !password || !invitationCode) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, username, name, invitationCode);
    setLoading(false);

    if (error) {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Account created successfully! Please log in.",
      });
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-semibold text-foreground mb-6">Register</h1>
        
        <div className="border border-border">
          <form onSubmit={handleSubmit}>
            {/* Name Row */}
            <div className="flex flex-col sm:flex-row border-b border-border">
              <div className="sm:w-2/5 bg-secondary/50 px-4 py-3 flex items-center">
                <Label htmlFor="name" className="text-foreground/80 text-sm">
                  Name:
                </Label>
              </div>
              <div className="sm:w-3/5 bg-card px-4 py-3">
                <Input 
                  id="name" 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-secondary border-border text-foreground h-9"
                />
              </div>
            </div>

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
            
            {/* Email Row */}
            <div className="flex flex-col sm:flex-row border-b border-border">
              <div className="sm:w-2/5 bg-secondary/50 px-4 py-3 flex items-center">
                <Label htmlFor="email" className="text-foreground/80 text-sm">
                  Email:
                </Label>
              </div>
              <div className="sm:w-3/5 bg-card px-4 py-3">
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
            
            {/* Confirm Password Row */}
            <div className="flex flex-col sm:flex-row border-b border-border">
              <div className="sm:w-2/5 bg-secondary/50 px-4 py-3 flex items-center">
                <Label htmlFor="confirm-password" className="text-foreground/80 text-sm">
                  Confirm Password:
                </Label>
              </div>
              <div className="sm:w-3/5 bg-card px-4 py-3">
                <Input 
                  id="confirm-password" 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-secondary border-border text-foreground h-9"
                />
              </div>
            </div>

            {/* Invitation Key Row */}
            <div className="flex flex-col sm:flex-row border-b border-border">
              <div className="sm:w-2/5 bg-secondary/50 px-4 py-3 flex items-center">
                <Label htmlFor="invitation-code" className="text-foreground/80 text-sm">
                  Invitation Key:
                </Label>
              </div>
              <div className="sm:w-3/5 bg-card px-4 py-3">
                <Input 
                  id="invitation-code" 
                  type="text" 
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
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
                  {loading ? "Registering..." : "Register"}
                </Button>
              </div>
            </div>
          </form>
        </div>
        
        <div className="mt-4 text-center text-muted-foreground text-sm">
          Already have an account?{" "}
          <NavLink to="/login" className="text-link hover:text-link-hover transition-colors underline">
            Login
          </NavLink>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Register;
