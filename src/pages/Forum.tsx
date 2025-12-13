import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Newspaper, HelpCircle, ArrowUp, Send, Paperclip, Download, Trash2, MessageSquare } from "lucide-react";

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
  section_id: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  profiles: {
    username: string;
    pfp_url: string | null;
    created_at: string;
  };
  authorRole?: string;
  authorSequentialId?: number;
}

interface Reply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    pfp_url: string | null;
    created_at: string;
  };
  authorRole?: string;
  authorSequentialId?: number;
}

const SECTION_CATEGORIES = {
  'General': ['announcements', 'questions'],
  'Downloads': ['updates'],
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
      return <MessageSquare className="w-4 h-4" />;
  }
};

const Forum = () => {
  const { user, loading, isAdmin, isElder } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sections, setSections] = useState<ForumSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<ForumSection | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Array<{ id: string; created_at: string }>>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState<{ reason: string; banned_by_username: string; ban_type: string } | null>(null);
  
  // Full screen post view
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      checkBanStatus();
      loadSections();
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

  useEffect(() => {
    if (selectedSection) {
      loadPosts(selectedSection.id);
      
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

  // Subscribe to replies when viewing a post
  useEffect(() => {
    if (viewingPost) {
      loadReplies(viewingPost.id);
      
      const channel = supabase
        .channel('replies-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'post_replies',
            filter: `post_id=eq.${viewingPost.id}`
          },
          () => {
            loadReplies(viewingPost.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [viewingPost]);

  const loadSections = async () => {
    const { data, error } = await supabase
      .from('forum_sections')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading sections:', error);
    }
    
    if (data) {
      setSections(data);
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, created_at')
      .order('created_at', { ascending: true });

    if (profiles) {
      setAllProfiles(profiles);
    }
  };

  const getSequentialId = (authorId: string) => {
    const index = allProfiles.findIndex(p => p.id === authorId);
    return index + 1;
  };

  const loadPosts = async (sectionId: string) => {
    let profiles = allProfiles;
    if (profiles.length === 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, created_at')
        .order('created_at', { ascending: true });
      
      if (profileData) {
        profiles = profileData;
        setAllProfiles(profileData);
      }
    }

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('section_id', sectionId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const authorIds = [...new Set(data.map((p: any) => p.author_id))];
      
      const { data: authorProfiles } = await supabase
        .from('profiles')
        .select('id, username, pfp_url, created_at')
        .in('id', authorIds);
      
      const profileMap = new Map(authorProfiles?.map(p => [p.id, p]) || []);
      
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', authorIds);

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const getSeqId = (authorId: string) => {
        const index = profiles.findIndex(p => p.id === authorId);
        return index + 1;
      };

      const postsWithRoles = data.map((post: any) => {
        const profile = profileMap.get(post.author_id);
        return {
          ...post,
          profiles: profile ? {
            username: profile.username,
            pfp_url: profile.pfp_url,
            created_at: profile.created_at,
          } : { username: 'Unknown', pfp_url: null, created_at: new Date().toISOString() },
          authorRole: roleMap.get(post.author_id) || 'user',
          authorSequentialId: getSeqId(post.author_id),
        };
      });

      setPosts(postsWithRoles);
    } else if (!error) {
      setPosts([]);
    }
  };

  const loadReplies = async (postId: string) => {
    let profiles = allProfiles;
    if (profiles.length === 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, created_at')
        .order('created_at', { ascending: true });
      
      if (profileData) {
        profiles = profileData;
        setAllProfiles(profileData);
      }
    }

    const { data, error } = await supabase
      .from('post_replies')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      const authorIds = [...new Set(data.map((r: any) => r.author_id))];
      
      const { data: authorProfiles } = await supabase
        .from('profiles')
        .select('id, username, pfp_url, created_at')
        .in('id', authorIds);
      
      const profileMap = new Map(authorProfiles?.map(p => [p.id, p]) || []);
      
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', authorIds);

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const getSeqId = (authorId: string) => {
        const index = profiles.findIndex(p => p.id === authorId);
        return index + 1;
      };

      const repliesWithProfiles = data.map((reply: any) => {
        const profile = profileMap.get(reply.author_id);
        return {
          ...reply,
          profiles: profile ? {
            username: profile.username,
            pfp_url: profile.pfp_url,
            created_at: profile.created_at,
          } : { username: 'Unknown', pfp_url: null, created_at: new Date().toISOString() },
          authorRole: roleMap.get(reply.author_id) || 'user',
          authorSequentialId: getSeqId(reply.author_id),
        };
      });

      setReplies(repliesWithProfiles);
    } else if (!error) {
      setReplies([]);
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

    const isRestrictedSection = selectedSection.slug === 'announcements' || selectedSection.slug === 'updates';
    if (isRestrictedSection && !isAdmin && !isElder) {
      toast({
        title: "Access Denied",
        description: "Only admins and elders can post in this section",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    let fileUrl = null;
    let fileName = null;
    let fileSize = null;
    
    // Upload file if selected
    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${user!.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-files')
        .upload(filePath, selectedFile);
      
      if (uploadError) {
        toast({
          title: "Error",
          description: "Failed to upload file",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      
      const { data: urlData } = supabase.storage
        .from('post-files')
        .getPublicUrl(filePath);
      
      fileUrl = urlData.publicUrl;
      fileName = selectedFile.name;
      fileSize = selectedFile.size;
    }
    
    const { error } = await supabase
      .from('posts')
      .insert({
        section_id: selectedSection.id,
        author_id: user!.id,
        title: newPostTitle,
        content: newPostContent,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
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
      setSelectedFile(null);
      setShowNewPost(false);
      loadPosts(selectedSection.id);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    
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
      closePost();
      if (selectedSection) {
        loadPosts(selectedSection.id);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 20MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!viewingPost || !newReply.trim()) {
      return;
    }

    setSubmittingReply(true);
    const { error } = await supabase
      .from('post_replies')
      .insert({
        post_id: viewingPost.id,
        author_id: user!.id,
        content: newReply.trim(),
      });

    setSubmittingReply(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    } else {
      setNewReply("");
    }
  };

  const openPost = (post: Post) => {
    setViewingPost(post);
    setReplies([]);
  };

  const closePost = () => {
    setViewingPost(null);
    setReplies([]);
    setNewReply("");
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
  // Banned users will not see forum content due to RLS, but we no longer show a full-screen ban page here.


  // Full screen post view
  if (viewingPost) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header onLogoClick={closePost} />
        
        <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl">
          {/* Thread header */}
          <div className="forum-header mb-0">
            <table className="forum-table">
              <thead>
                <tr>
                  <th colSpan={2}>{viewingPost.title}</th>
                </tr>
              </thead>
            </table>
          </div>

          {/* Original Post */}
          <table className="forum-table mb-4">
            <tbody>
              <tr className="forum-row">
                {/* User info cell */}
                <td className="w-40 align-top">
                  <div className="flex flex-col items-center p-2">
                    <div className="w-20 h-20 overflow-hidden border border-border mb-2">
                      <img 
                        src={viewingPost.profiles.pfp_url || '/default-pfp.png'} 
                        alt={viewingPost.profiles.username} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="font-bold text-primary text-sm">{viewingPost.profiles.username}</p>
                    <p className="text-xs text-muted-foreground">ID: #{viewingPost.authorSequentialId || getSequentialId(viewingPost.author_id)}</p>
                    <p className={`text-xs font-semibold capitalize ${
                      viewingPost.authorRole === 'admin' ? 'text-destructive' : 
                      viewingPost.authorRole === 'elder' ? 'text-purple-600' : 
                      'text-muted-foreground'
                    }`}>{viewingPost.authorRole || 'user'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined: {new Date(viewingPost.profiles.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </td>
                
                {/* Post content cell */}
                <td className="align-top">
                  <div className="p-3">
                    <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
                      <span className="text-xs text-muted-foreground">
                        Posted: {new Date(viewingPost.created_at).toLocaleString()}
                      </span>
                      {(isAdmin || isElder) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePost(viewingPost.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 px-2"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                    <div className="text-foreground whitespace-pre-wrap mb-4">{viewingPost.content}</div>
                    
                    {/* File attachment */}
                    {viewingPost.file_url && viewingPost.file_name && (
                      <a 
                        href={viewingPost.file_url} 
                        download={viewingPost.file_name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-secondary border border-border hover:bg-muted transition-colors text-sm"
                      >
                        <Download className="w-4 h-4" />
                        <span>{viewingPost.file_name}</span>
                        {viewingPost.file_size && (
                          <span className="text-xs text-muted-foreground">({formatFileSize(viewingPost.file_size)})</span>
                        )}
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Replies Section */}
          <div className="forum-header">
            <table className="forum-table">
              <thead>
                <tr>
                  <th colSpan={2}>Replies ({replies.length})</th>
                </tr>
              </thead>
            </table>
          </div>
          
          <table className="forum-table mb-4">
            <tbody>
              {replies.length === 0 ? (
                <tr className="forum-row">
                  <td colSpan={2} className="text-center py-6 text-muted-foreground">
                    No replies yet. Be the first to reply!
                  </td>
                </tr>
              ) : (
                replies.map((reply, index) => (
                  <tr key={reply.id} className={index % 2 === 0 ? 'forum-row' : ''} style={index % 2 !== 0 ? { background: 'hsl(210 25% 92%)' } : {}}>
                    <td className="w-40 align-top">
                      <div className="flex flex-col items-center p-2">
                        <div className="w-14 h-14 overflow-hidden border border-border mb-2">
                          <img 
                            src={reply.profiles.pfp_url || '/default-pfp.png'} 
                            alt={reply.profiles.username} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="font-bold text-primary text-xs">{reply.profiles.username}</p>
                        <p className="text-[10px] text-muted-foreground">#{reply.authorSequentialId}</p>
                        <p className={`text-[10px] font-semibold capitalize ${
                          reply.authorRole === 'admin' ? 'text-destructive' : 
                          reply.authorRole === 'elder' ? 'text-purple-600' : 
                          'text-muted-foreground'
                        }`}>{reply.authorRole || 'user'}</p>
                      </div>
                    </td>
                    <td className="align-top">
                      <div className="p-3">
                        <div className="border-b border-border pb-2 mb-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(reply.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-foreground text-sm whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Reply Input */}
          <div className="forum-header">
            <table className="forum-table">
              <thead>
                <tr>
                  <th>Quick Reply</th>
                </tr>
              </thead>
            </table>
          </div>
          <form onSubmit={handleSubmitReply} className="bg-card border border-border p-4">
            <div className="flex gap-3">
              <Textarea
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder="Write a reply..."
                rows={3}
                className="bg-input flex-1"
              />
              <Button type="submit" disabled={submittingReply || !newReply.trim()} className="self-end">
                <Send className="w-4 h-4 mr-2" />
                Reply
              </Button>
            </div>
          </form>
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Forum Title Header */}
        <div className="forum-header mb-0">
          <table className="forum-table">
            <thead>
              <tr>
                <th colSpan={4}>Godsent.win Forum</th>
              </tr>
            </thead>
          </table>
        </div>

        {/* Forum Sections Table */}
        <table className="forum-table mb-6">
          <thead className="forum-header">
            <tr>
              <th className="w-12"></th>
              <th>Forum</th>
              <th className="w-24 text-center">Threads</th>
              <th className="w-48 text-right">Last Post</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(SECTION_CATEGORIES).map(([category, slugs]) => {
              const categorySections = sections.filter(s => slugs.includes(s.slug));
              if (categorySections.length === 0) return null;
              
              return (
                <>
                  {/* Category Header */}
                  <tr key={`cat-${category}`} className="forum-category">
                    <td colSpan={4}>{category}</td>
                  </tr>
                  
                  {/* Section Rows */}
                  {categorySections.map((section, idx) => (
                    <tr 
                      key={section.id} 
                      className={`forum-row cursor-pointer`}
                      onClick={() => {
                        setSelectedSection(section);
                        setShowNewPost(false);
                      }}
                    >
                      <td className="text-center">
                        <div className="flex items-center justify-center text-primary">
                          {getSectionIcon(section.slug)}
                        </div>
                      </td>
                      <td>
                        <span className="forum-link font-semibold">{section.name}</span>
                        {section.description && (
                          <p className="forum-subtext mt-1">{section.description}</p>
                        )}
                      </td>
                      <td className="text-center text-sm text-muted-foreground">
                        -
                      </td>
                      <td className="text-right text-sm text-muted-foreground">
                        -
                      </td>
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>

        {/* Selected Section Posts */}
        {selectedSection && (
          <>
            <div className="forum-header mb-0">
              <table className="forum-table">
                <thead>
                  <tr>
                    <th className="flex items-center justify-between">
                      <span>{selectedSection.name}</span>
                      {(selectedSection.slug === 'questions' || (isAdmin && (selectedSection.slug === 'announcements' || selectedSection.slug === 'updates'))) && (
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowNewPost(!showNewPost);
                          }}
                          size="sm"
                          variant={showNewPost ? "outline" : "default"}
                          className="h-7"
                        >
                          {showNewPost ? 'Cancel' : 'New Thread'}
                        </Button>
                      )}
                    </th>
                  </tr>
                </thead>
              </table>
            </div>

            {showNewPost && (
              <div className="bg-card border border-border p-4 mb-4">
                <form onSubmit={handleCreatePost} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Thread Title</Label>
                    <Input
                      id="title"
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      placeholder="Enter thread title"
                      className="bg-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Message</Label>
                    <Textarea
                      id="content"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Enter your message"
                      rows={5}
                      className="bg-input"
                    />
                  </div>
                  
                  {/* File attachment */}
                  <div className="space-y-2">
                    <Label>Attach File (optional)</Label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="w-4 h-4 mr-2" />
                        {selectedFile ? 'Change File' : 'Attach File'}
                      </Button>
                      {selectedFile && (
                        <span className="text-sm text-muted-foreground">
                          {selectedFile.name} ({formatFileSize(selectedFile.size)})
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Post New Thread'}
                  </Button>
                </form>
              </div>
            )}

            <table className="forum-table">
              <thead className="forum-header">
                <tr>
                  <th className="w-12"></th>
                  <th>Thread</th>
                  <th className="w-32 text-center">Author</th>
                  <th className="w-32 text-right">Posted</th>
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 ? (
                  <tr className="forum-row">
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      No threads yet. Be the first to start a discussion!
                    </td>
                  </tr>
                ) : (
                  posts.map((post, idx) => (
                    <tr 
                      key={post.id} 
                      className="forum-row cursor-pointer"
                      onClick={() => openPost(post)}
                    >
                      <td className="text-center">
                        <MessageSquare className="w-4 h-4 text-primary mx-auto" />
                      </td>
                      <td>
                        <span className="forum-link">{post.title}</span>
                      </td>
                      <td className="text-center">
                        <span className="text-sm text-primary">{post.profiles.username}</span>
                      </td>
                      <td className="text-right">
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {/* Back button */}
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedSection(null)}
              >
                ← Back to Forums
              </Button>
            </div>
          </>
        )}

        {/* Welcome message when no section selected */}
        {!selectedSection && (
          <div className="bg-card border border-border p-6 text-center">
            <p className="text-muted-foreground">Click on a forum section above to view threads</p>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Forum;
