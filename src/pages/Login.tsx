import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BanInfo {
  ban_type: string;
  reason: string;
  suspended_until: string | null;
  appeal_deadline: string | null;
  appeal_submitted: boolean;
}

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const { user, signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/forum");
    }
  }, [user, navigate]);

  const checkBanStatus = async (usernameToCheck: string): Promise<BanInfo | null> => {
    // Get user ID from username
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', usernameToCheck)
      .maybeSingle();

    if (!profile) return null;

    // Check if user is banned
    const { data: banData } = await supabase
      .from('banned_users')
      .select('ban_type, reason, suspended_until, appeal_deadline, appeal_submitted')
      .eq('user_id', profile.id)
      .maybeSingle();

    return banData;
  };

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
    setBanInfo(null);

    // Check ban status first
    const banStatus = await checkBanStatus(username);
    
    if (banStatus) {
      // Check if it's a suspension that has expired
      if (banStatus.ban_type === 'suspended' && banStatus.suspended_until) {
        const suspendedUntil = new Date(banStatus.suspended_until);
        if (suspendedUntil > new Date()) {
          // Still suspended
          setBanInfo(banStatus);
          setLoading(false);
          return;
        } else {
          // Suspension expired - remove from banned_users
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .maybeSingle();
          
          if (profile) {
            await supabase.from('banned_users').delete().eq('user_id', profile.id);
          }
        }
      } else if (banStatus.ban_type === 'banned') {
        // Permanently banned
        setBanInfo(banStatus);
        setLoading(false);
        return;
      }
    }

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

  const formatSuspensionTime = (suspendedUntil: string) => {
    const endDate = new Date(suspendedUntil);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} and ${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const formatAppealDeadline = (appealDeadline: string) => {
    const deadline = new Date(appealDeadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  // Show ban/suspension message
  if (banInfo) {
    const isSuspended = banInfo.ban_type === 'suspended';
    
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
          <div className="border border-destructive bg-destructive/10 p-6">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              {isSuspended ? 'Account Suspended' : 'Account Banned'}
            </h1>
            
            {isSuspended && banInfo.suspended_until ? (
              <div className="space-y-4">
                <p className="text-foreground">
                  <span className="font-semibold">Error:</span> User suspended for {formatSuspensionTime(banInfo.suspended_until)}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-semibold">Reason:</span> {banInfo.reason}
                </p>
                <p className="text-muted-foreground text-sm">
                  Your account will be automatically restored on {new Date(banInfo.suspended_until).toLocaleDateString()}.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-foreground">
                  <span className="font-semibold">Error:</span> User banned - appeal{' '}
                  <Link 
                    to={`/unban-appeal?username=${encodeURIComponent(username)}`}
                    className="text-accent underline hover:text-accent/80"
                  >
                    here
                  </Link>
                </p>
                <p className="text-muted-foreground">
                  <span className="font-semibold">Reason:</span> {banInfo.reason}
                </p>
                {banInfo.appeal_deadline && !banInfo.appeal_submitted && (
                  <p className="text-destructive text-sm font-semibold">
                    Warning: If no unban request is submitted within {formatAppealDeadline(banInfo.appeal_deadline)} days, your account will be terminated.
                  </p>
                )}
                {banInfo.appeal_submitted && (
                  <p className="text-accent text-sm">
                    Your appeal has been submitted and is pending review.
                  </p>
                )}
              </div>
            )}
            
            <Button 
              onClick={() => setBanInfo(null)} 
              variant="outline" 
              className="mt-6"
            >
              Back to Login
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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