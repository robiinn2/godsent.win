import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InfoCard from "@/components/InfoCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Newspaper, HelpCircle, ArrowUp } from "lucide-react";

interface ForumSection {
  id: string;
  name: string;
  slug: string;
  description: string;
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
}

const SECTION_CATEGORIES = {
  'Information': ['announcements', 'questions'],
  'Software': ['updates'],
};

const getSectionIcon = (slug: string) => {
  switch (slug) {
    case 'announcements':
      return <Newspaper className="w-4 h-4" />;
    case 'questions':
      return <HelpCircle className="w-4 h-4" />;
    case 'updates':
      return <ArrowUp className="w-4 h-4" />;
    default:
      return null;
  }
};

const Forum = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sections, setSections] = useState<ForumSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<ForumSection | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadSections();
    }
  }, [user]);

  useEffect(() => {
    if (selectedSection) {
      loadPosts(selectedSection.id);
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('posts-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'posts',
            filter: `section_id=eq.${selectedSection.id}`
          },
          () => {
            loadPosts(selectedSection.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedSection]);

  const loadSections = async () => {
    const { data, error } = await supabase
      .from('forum_sections')
      .select('*')
      .order('name');

    if (!error && data) {
      setSections(data);
    }
  };

  const loadPosts = async (sectionId: string) => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (username)
      `)
      .eq('section_id', sectionId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPosts(data as any);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSection || !newPostTitle || !newPostContent) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Check if user can post in this section
    const isRestrictedSection = selectedSection.slug === 'announcements' || selectedSection.slug === 'updates';
    if (isRestrictedSection && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only admins can post in this section",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from('posts')
      .insert({
        section_id: selectedSection.id,
        author_id: user!.id,
        title: newPostTitle,
        content: newPostContent,
      });

    setSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Post created successfully",
      });
      setNewPostTitle("");
      setNewPostContent("");
      setShowNewPost(false);
      loadPosts(selectedSection.id);
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sections Sidebar */}
          <div className="md:col-span-1">
            <InfoCard title="Forum Sections">
              <div className="space-y-4">
                {Object.entries(SECTION_CATEGORIES).map(([category, slugs]) => {
                  const categorySections = sections.filter(s => slugs.includes(s.slug));
                  if (categorySections.length === 0) return null;
                  
                  return (
                    <div key={category}>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 px-2">
                        {category}
                      </p>
                      <div className="space-y-1">
                        {categorySections.map((section) => (
                          <button
                            key={section.id}
                            onClick={() => {
                              setSelectedSection(section);
                              setShowNewPost(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center gap-2 ${
                              selectedSection?.id === section.id
                                ? 'bg-primary text-primary-foreground'
                                : 'text-foreground hover:bg-secondary/80'
                            }`}
                          >
                            {getSectionIcon(section.slug)}
                            <span>{section.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </InfoCard>
          </div>

          {/* Posts Area */}
          <div className="md:col-span-3">
            {selectedSection ? (
              <>
                <InfoCard title={selectedSection.name}>
                  <p className="text-muted-foreground mb-4">{selectedSection.description}</p>
                  
                  {(selectedSection.slug === 'resell' || selectedSection.slug === 'questions' || isAdmin) && (
                    <Button 
                      onClick={() => setShowNewPost(!showNewPost)}
                      className="mb-4"
                    >
                      {showNewPost ? 'Cancel' : 'New Post'}
                    </Button>
                  )}

                  {showNewPost && (
                    <form onSubmit={handleCreatePost} className="space-y-4 mb-6 p-4 bg-card border border-border rounded">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={newPostTitle}
                          onChange={(e) => setNewPostTitle(e.target.value)}
                          placeholder="Enter post title"
                          className="bg-secondary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea
                          id="content"
                          value={newPostContent}
                          onChange={(e) => setNewPostContent(e.target.value)}
                          placeholder="Enter post content"
                          rows={5}
                          className="bg-secondary"
                        />
                      </div>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? 'Creating...' : 'Create Post'}
                      </Button>
                    </form>
                  )}

                  <div className="space-y-4">
                    {posts.length === 0 ? (
                      <p className="text-muted-foreground">No posts yet</p>
                    ) : (
                      posts.map((post) => (
                        <div key={post.id} className="p-4 bg-card border border-border rounded">
                          <h3 className="text-lg font-bold text-foreground mb-2">{post.title}</h3>
                          <p className="text-foreground mb-2">{post.content}</p>
                          <p className="text-sm text-muted-foreground">
                            Posted by {post.profiles.username} on {new Date(post.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </InfoCard>
              </>
            ) : (
              <InfoCard title="Welcome to the Forum">
                <p className="text-foreground">Select a section from the sidebar to view posts</p>
              </InfoCard>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Forum;
