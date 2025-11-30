import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InfoCard from "@/components/InfoCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  username: string;
  email: string;
  name: string;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles: {
    username: string;
  };
  forum_sections: {
    name: string;
  };
}

const AdminPanel = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadUsers();
      loadAllPosts();
    }
  }, [user, isAdmin]);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsers(data);
    }
  };

  const loadAllPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (username),
        forum_sections (name)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPosts(data as any);
    }
  };

  const handleBanUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to ban ${username}?`)) {
      return;
    }

    const { error } = await supabase
      .from('banned_users')
      .insert({
        user_id: userId,
        banned_by: user!.id,
        reason: 'Banned by admin',
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `${username} has been banned`,
      });
      loadUsers();
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
      loadAllPosts();
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">Admin Panel</h1>

        {/* Users Section */}
        <InfoCard title="Manage Users">
          <div className="mb-4">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-secondary max-w-md"
            />
          </div>

          <div className="space-y-2">
            {filteredUsers.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between p-4 bg-card border border-border rounded">
                <div>
                  <p className="font-bold text-foreground">{profile.username}</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => handleBanUser(profile.id, profile.username)}
                  disabled={profile.id === user.id}
                >
                  Ban User
                </Button>
              </div>
            ))}
          </div>
        </InfoCard>

        {/* Posts Section */}
        <div className="mt-6">
          <InfoCard title="Manage Posts">
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="p-4 bg-card border border-border rounded">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-2">{post.title}</h3>
                    <p className="text-foreground mb-2">{post.content}</p>
                    <p className="text-sm text-muted-foreground">
                      Posted by {post.profiles.username} in {post.forum_sections.name} on{' '}
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeletePost(post.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </InfoCard>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminPanel;
