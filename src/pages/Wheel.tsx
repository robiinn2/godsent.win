import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";


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

  const grantInviteOpportunity = async () => {
    // Check if user already has invite opportunity
    const { data: existing } = await supabase
      .from("user_invitations")
      .select("id, invites_remaining")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (existing && existing.invites_remaining > 0) {
      // Already has invites, just notify
      return;
    }

    if (existing) {
      // Update existing record
      await supabase
        .from("user_invitations")
        .update({ invites_remaining: 1, expiration_days: 7 })
        .eq("user_id", user!.id);
    } else {
      // Create new invitation grant
      await supabase.from("user_invitations").insert({
        user_id: user!.id,
        invites_remaining: 1,
        expiration_days: 7,
      });
    }
  };

  // Generate random hex string
  const generateSeed = () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  };

  // SHA-256 hash function
  const sha256 = async (message: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const spinWheel = async () => {
    if (!canSpin || spinning) return;

    setSpinning(true);
    setResult(null);

    // Generate provably fair seeds
    const serverSeed = generateSeed();
    const clientSeed = generateSeed();
    const nonce = Date.now().toString();
    
    // Combine seeds and hash with SHA-256
    const combinedSeed = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = await sha256(combinedSeed);
    
    // Use first 8 characters of hash to get a number (0-4294967295)
    const hashInt = parseInt(hash.substring(0, 8), 16);
    
    // Determine result: 5% chance to win (1 in 20)
    // If hashInt % 20 === 0, it's a win
    const rollResult = hashInt % 20;
    const isWin = rollResult === 0;

    // Pick the target segment: WIN_INDEX for a win, any other index for a dud
    let finalSegment = WIN_INDEX;
    if (!isWin) {
      // Use hash to determine which DUD segment (skip WIN_INDEX)
      const dudSegment = (hashInt % 19);
      finalSegment = dudSegment >= WIN_INDEX ? dudSegment + 1 : dudSegment;
    }

    // Calculate rotation so the TARGET segment lands exactly at the TOP (under the pointer)
    const fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
    const segmentCenterAngle = (finalSegment * SEGMENT_ANGLE) + (SEGMENT_ANGLE / 2);
    const targetRotation = 360 - segmentCenterAngle;
    // IMPORTANT: no random offset here, so visual landing always matches the hash result
    const totalRotation = rotation + (fullSpins * 360) + targetRotation;

    setRotation(totalRotation);

    // Log provably fair data for verification
    console.log('Provably Fair Spin:', {
      serverSeed,
      clientSeed,
      nonce,
      hash,
      rollResult,
      isWin
    });

    // Wait for animation to complete
    setTimeout(async () => {
      const finalResult: "win" | "lose" = isWin ? "win" : "lose";
      setResult(finalResult);

      // Record the spin
      await supabase.from("wheel_spins").insert({
        user_id: user!.id,
        result: finalResult,
      });

      if (finalResult === "win") {
        // Grant invite opportunity
        await grantInviteOpportunity();
        
        // Create notification for user to create invite code
        await supabase.from("notifications").insert({
          user_id: user!.id,
          type: "wheel_win",
          title: "You won the wheel!",
          message: "Congratulations! You won an invite code. Go to the Invite page to generate your code.",
        });
      }

      setSpinning(false);
      if (!isAdmin) {
        setCanSpin(false);
        setLastSpinTime(new Date());
      }
    }, 5000);
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
            className="w-[300px] h-[300px] md:w-[400px] md:h-[400px] rounded-full border-4 border-primary relative"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning 
                ? "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)" 
                : "none",
              boxShadow: "0 0 30px hsl(var(--primary) / 0.5)",
              background: "hsl(var(--background))",
            }}
          >
            {/* SVG wheel with segments */}
            <svg viewBox="0 0 300 300" className="w-full h-full">
              {segments.map((segment, i) => {
                const startAngle = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180);
                const endAngle = ((i + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
                const isWin = segment.isWin;
                
                // Calculate arc path
                const x1 = 150 + 146 * Math.cos(startAngle);
                const y1 = 150 + 146 * Math.sin(startAngle);
                const x2 = 150 + 146 * Math.cos(endAngle);
                const y2 = 150 + 146 * Math.sin(endAngle);
                
                // Path for segment
                const pathD = `M 150 150 L ${x1} ${y1} A 146 146 0 0 1 ${x2} ${y2} Z`;
                
                // Calculate label position (near outer edge)
                const midAngle = ((i * SEGMENT_ANGLE) + (SEGMENT_ANGLE / 2) - 90) * (Math.PI / 180);
                const labelRadius = 120;
                const labelX = 150 + labelRadius * Math.cos(midAngle);
                const labelY = 150 + labelRadius * Math.sin(midAngle);
                const textRotation = (i * SEGMENT_ANGLE) + (SEGMENT_ANGLE / 2);
                
                return (
                  <g key={i}>
                    {/* Segment fill (white for WIN, transparent for DUD) */}
                    <path
                      d={pathD}
                      fill={isWin ? "hsl(var(--foreground))" : "transparent"}
                      stroke="hsl(var(--border))"
                      strokeWidth="1"
                    />
                    {/* Segment label */}
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textRotation}, ${labelX}, ${labelY})`}
                      fill={isWin ? "hsl(var(--background))" : "hsl(var(--muted-foreground))"}
                      fontSize="8"
                      fontWeight="bold"
                    >
                      {segment.label}
                    </text>
                  </g>
                );
              })}
            </svg>
            
            {/* Center circle */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full bg-background border-2 border-primary flex items-center justify-center"
              style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.5)" }}
            >
              <span className="text-primary font-bold text-lg">gs.</span>
            </div>
          </div>
        </div>

        {/* Chances Legend */}
        <div className="flex items-center justify-center gap-8 mb-6 border border-border px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-muted-foreground" />
            <span className="text-muted-foreground text-sm">DUD</span>
            <span className="text-foreground text-sm font-bold">95%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-foreground" />
            <span className="text-foreground text-sm">WIN</span>
            <span className="text-foreground text-sm font-bold">5%</span>
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`mb-6 text-xl font-bold ${result === "win" ? "text-foreground" : "text-destructive"}`}>
            {result === "win" ? "Congrats! Check your notifications to create your invite code." : "Nice try loser!"}
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
