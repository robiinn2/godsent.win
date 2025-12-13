import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Percent } from "lucide-react";

const SEGMENTS = 20;
const SEGMENT_ANGLE = 360 / SEGMENTS;
const WIN_INDEX = 7; // The winning segment position

const Wheel = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [canSpin, setCanSpin] = useState(false);
  const [lastSpinTime, setLastSpinTime] = useState<Date | null>(null);
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [loading, setLoading] = useState(true);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkLastSpin();
    }
  }, [user]);

  const checkLastSpin = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("wheel_spins")
        .select("spun_at")
        .eq("user_id", user!.id)
        .gte("spun_at", today.toISOString())
        .order("spun_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setLastSpinTime(new Date(data[0].spun_at));
        setCanSpin(isAdmin); // Admins can always spin
      } else {
        setCanSpin(true);
      }
    } catch (error) {
      console.error("Error checking last spin:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateInviteCode = async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const generateGroup = () => {
      let group = "";
      for (let i = 0; i < 4; i++) {
        group += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return group;
    };

    const key = `Godsent-${generateGroup()}-${generateGroup()}-${generateGroup()}-${generateGroup()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user!.id)
      .single();

    const { error } = await supabase.from("invitation_codes").insert({
      key,
      created_by: user!.id,
      creator_username: profile?.username || "Unknown",
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      console.error("Error creating invite code:", error);
      return null;
    }

    return key;
  };

  const spinWheel = async () => {
    if (!canSpin || spinning) return;

    setSpinning(true);
    setResult(null);

    // Determine result - 1/20 chance to win (5%)
    const isWin = Math.random() < 0.05;
    const targetSegment = isWin ? WIN_INDEX : Math.floor(Math.random() * SEGMENTS);
    
    // Skip the win segment if it's a loss
    const finalSegment = !isWin && targetSegment === WIN_INDEX 
      ? (targetSegment + 1) % SEGMENTS 
      : targetSegment;

    // Calculate rotation: multiple full spins + landing on target segment
    const fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
    const segmentRotation = finalSegment * SEGMENT_ANGLE;
    const extraOffset = Math.random() * (SEGMENT_ANGLE * 0.8); // Random offset within segment
    const totalRotation = rotation + (fullSpins * 360) + segmentRotation + extraOffset;

    setRotation(totalRotation);

    // Wait for animation to complete
    setTimeout(async () => {
      const finalResult = finalSegment === WIN_INDEX ? "win" : "lose";
      setResult(finalResult);

      // Record the spin
      await supabase.from("wheel_spins").insert({
        user_id: user!.id,
        result: finalResult,
      });

      if (finalResult === "win") {
        const code = await generateInviteCode();
        if (code) {
          toast.success(`You won! Your invite code: ${code}`, {
            duration: 10000,
          });
        }
      } else {
        toast.error("Nice try loser!", {
          duration: 3000,
        });
      }

      setSpinning(false);
      if (!isAdmin) {
        setCanSpin(false);
        setLastSpinTime(new Date());
      }
    }, 5000); // Match animation duration
  };

  const getTimeUntilNextSpin = () => {
    if (!lastSpinTime) return null;
    
    const tomorrow = new Date(lastSpinTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const now = new Date();
    const diff = tomorrow.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const segments = Array.from({ length: SEGMENTS }, (_, i) => ({
    index: i,
    isWin: i === WIN_INDEX,
    label: i === WIN_INDEX ? "WIN" : "DUD",
  }));

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-foreground mb-8">Spin the Wheel</h1>
        
        {/* Wheel Container */}
        <div className="relative mb-8">
          {/* Pointer/Triangle at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div 
              className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-primary"
              style={{ filter: "drop-shadow(0 0 10px hsl(var(--primary)))" }}
            />
          </div>
          
          {/* Wheel */}
          <div 
            ref={wheelRef}
            className="w-[300px] h-[300px] md:w-[400px] md:h-[400px] rounded-full border-4 border-primary relative overflow-hidden"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning 
                ? "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)" 
                : "none",
              boxShadow: "0 0 30px hsl(var(--primary) / 0.5)",
            }}
          >
            {segments.map((segment, i) => {
              const midAngle = (i * SEGMENT_ANGLE) + (SEGMENT_ANGLE / 2);
              const isWin = segment.isWin;
              
              return (
                <div
                  key={i}
                  className="absolute w-full h-full"
                >
                  {/* Segment divider line */}
                  <div
                    className="absolute top-0 left-1/2 origin-bottom h-1/2 w-[1px]"
                    style={{
                      transform: `rotate(${i * SEGMENT_ANGLE}deg)`,
                      transformOrigin: "bottom center",
                      background: "hsl(var(--border))",
                    }}
                  />
                  {/* Segment label - centered in segment */}
                  <div
                    className="absolute text-[8px] md:text-[10px] font-bold"
                    style={{
                      top: "20%",
                      left: "50%",
                      transform: `rotate(${midAngle}deg) translateY(-50%)`,
                      transformOrigin: "0 150px",
                      color: isWin ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                      textShadow: isWin ? "0 0 10px hsl(var(--primary))" : "none",
                    }}
                  >
                    {segment.label}
                  </div>
                </div>
              );
            })}
            
            {/* Center circle */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full bg-background border-2 border-primary flex items-center justify-center"
              style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.5)" }}
            >
              <span className="text-primary font-bold text-lg">gs.</span>
        </div>

        {/* Chances Display */}
        <div className="flex items-center gap-2 mb-6 text-muted-foreground">
          <Percent className="h-4 w-4" />
          <span className="text-sm">Win chance: <span className="text-primary font-bold">5%</span> (1 in 20)</span>
        </div>
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`mb-6 text-xl font-bold ${result === "win" ? "text-primary" : "text-destructive"}`}>
            {result === "win" ? "🎉 YOU WON! Check your notifications!" : "Nice try loser!"}
          </div>
        )}

        {/* Spin Button */}
        <Button
          onClick={spinWheel}
          disabled={!canSpin || spinning}
          className="px-8 py-4 text-lg"
        >
          {spinning ? "Spinning..." : canSpin ? "SPIN" : `Next spin in ${getTimeUntilNextSpin() || "tomorrow"}`}
        </Button>

        {isAdmin && (
          <p className="text-muted-foreground text-sm mt-4">
            Admin: Unlimited spins enabled
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Wheel;
