import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InfoCard from "@/components/InfoCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";

interface ProfileData {
  id: string;
  username: string;
  name: string;
  email: string;
  pfp_url: string | null;
  created_at: string;
}

interface UserRole {
  role: 'admin' | 'user' | 'elder';
}

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [postCount, setPostCount] = useState(0);
  const [sequentialId, setSequentialId] = useState<number>(0);
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState<{ reason: string; banned_by_username: string; ban_type: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      checkBanStatus();
      loadProfile();
      loadPostCount();
      loadSequentialId();
    }
  }, [user]);

  const checkBanStatus = async () => {
    const { data } = await supabase
      .from('banned_users')
      .select('reason, banned_by_username, ban_type')
      .eq('user_id', user!.id)
      .maybeSingle();
    
    if (data) {
      setIsBanned(true);
      setBanInfo(data);
    }
  };

  const loadProfile = async () => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user!.id);

    if (roleData && roleData.length > 0) {
      // Get highest role: admin > elder > user
      const roles = roleData.map(r => r.role);
      if (roles.includes('admin')) {
        setUserRole('admin');
      } else if (roles.includes('elder')) {
        setUserRole('elder');
      } else {
        setUserRole('user');
      }
    }
  };

  const loadPostCount = async () => {
    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', user!.id);

    setPostCount(count || 0);
  };

  const loadSequentialId = async () => {
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, created_at')
      .order('created_at', { ascending: true });

    if (allProfiles) {
      const index = allProfiles.findIndex(p => p.id === user!.id);
      setSequentialId(index + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Banned user view is now handled on the login page via a small error box.
  // Banned users will not see profile content due to RLS, but we no longer show a full-screen ban page here.


  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <InfoCard title="Your Profile">
          <div className="flex flex-col items-center gap-6">
            {/* Profile Picture */}
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-border">
              <img 
                src={profile.pfp_url || '/default-pfp.png'} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>

            {/* Profile Info */}
            <div className="w-full space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">User ID</p>
                  <p className="text-2xl font-bold text-foreground">#{sequentialId}</p>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Posts</p>
                  <p className="text-2xl font-bold text-foreground">{postCount}</p>
                </div>
              </div>

              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Username</p>
                <p className="text-lg font-semibold text-foreground">{profile.username}</p>
              </div>

              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Name</p>
                <p className="text-lg text-foreground">{profile.name}</p>
              </div>

              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Role</p>
                <p className={`text-lg font-semibold capitalize ${
                  userRole === 'admin' ? 'text-red-500' : 
                  userRole === 'elder' ? 'text-purple-500' : 
                  'text-foreground'
                }`}>{userRole}</p>
              </div>

              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Join Date</p>
                <p className="text-lg text-foreground">
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Change Profile Picture */}
            <div className="w-full pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Change Profile Picture</p>
              <ProfilePictureUpload />
            </div>
          </div>
        </InfoCard>
      </main>
      
      <Footer />
    </div>
  );
};

export default Profile;