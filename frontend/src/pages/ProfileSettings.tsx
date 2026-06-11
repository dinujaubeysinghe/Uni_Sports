import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Lock,
  Bell,
  LogOut,
  Camera,
  CheckCircle2,
  AlertCircle,
  Edit2,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type ProfileData = {
  name: string;
  email: string;
  profilePhoto?: string;
  registeredSports: number;
  activeSessions: number;
  assignedSports: number;
};

export default function ProfileSettings() {
  const { user, role, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app";

  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    profilePhoto: "",
    registeredSports: 0,
    activeSessions: 0,
    assignedSports: 0,
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);

  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [originalName, setOriginalName] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    setProfile({
      name: user.name || "",
      email: user.email || "",
      profilePhoto: (user as any).avatar || "",
      registeredSports: Number((user as any).registeredSports || 0),
      activeSessions: Number((user as any).activeSessions || 0),
      assignedSports: Number((user as any).assignedSports || 0),
    });
    setOriginalName(user.name || "");
    setPhotoPreview((user as any).avatar || "");
  }, [user]);

  const notify = (message: string, success = true) => {
    if (success) toast.success(message);
    else toast.error(message);
    if (success) setSuccessMessage(message);
    else setErrorMessage(message);
    setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 3000);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) {
      notify("Name cannot be empty", false);
      return;
    }

    setLoading(true);
    try {
      const userPayload = {
        name: profile.name,
        notifications,
        twoFactor,
        privateProfile,
      };

      const profileResult = await updateProfile(userPayload);
      if (!profileResult.success) {
        throw new Error(profileResult.message || "Unable to save profile settings");
      }

      if (photoFile) {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("avatar", photoFile);

        const photoResp = await fetch(`${API_BASE}/api/users/me/avatar`, {
          method: "PUT",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        if (!photoResp.ok) {
          console.warn("Could not upload avatar");
        }
      }

      notify("Settings saved successfully");
      setOriginalName(profile.name);
    } catch (err) {
      console.error(err);
      notify("Failed to save profile settings", false);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!password.currentPassword || !password.newPassword || !password.confirmPassword) {
      notify("Fill all password fields", false);
      return;
    }

    if (password.newPassword !== password.confirmPassword) {
      notify("Password mismatch", false);
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  if (!passwordRegex.test(password.newPassword)) {
    notify(
      "Password must be at least 8 characters and include uppercase, lowercase, and a number",
      false
    );
    return;
  }

  setLoading(true);
  try {
    const resp = await fetch(`${API_BASE}/api/users/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(password),
    });

    if (!resp.ok) throw new Error("Unable to update password");

    setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
    notify("Password updated successfully");
  } catch (err) {
    console.error(err);
    notify("Failed to update password", false);
  } finally {
    setLoading(false);
  }

    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/users/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(password),
      });

      if (!resp.ok) throw new Error("Unable to update password");
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      notify("Password updated successfully");
    } catch (err) {
      console.error(err);
      notify("Failed to update password", false);
    } finally {
      setLoading(false);
    }
  };

  return (
    
      <div className="space-y-6 page-shell">
        <PageHeader title="Profile Settings" description="Manage your account, security, and visual identity." />

        {successMessage && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center gap-3">
            <CheckCircle2 className="text-emerald-300" size={18} />
            <p className="text-sm text-emerald-100 font-medium">{successMessage}</p>
          </div>
        )}
        {errorMessage && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/15 p-4 flex items-center gap-3">
            <AlertCircle className="text-destructive" size={18} />
            <p className="text-sm text-destructive-foreground font-medium">{errorMessage}</p>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-4">
          <section className="xl:col-span-3 surface-card rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-border shadow-sm bg-muted">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-primary text-3xl font-bold">
                        {profile.name.charAt(0) || "U"}
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-2 rounded-full shadow transition hover:opacity-90 cursor-pointer">
                    <Camera className="h-3.5 w-3.5" />
                    <input type="file" onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                  </label>
                </div>
                <div>
                  {isEditingName ? (
                    <div>
                      <Input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="mb-2 text-2xl text-black font-bold"
                        placeholder="Enter your name"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setIsEditingName(false)}
                          className="bg-primary hover:opacity-90 text-primary-foreground text-xs px-3 py-1"
                        >
                          Done
                        </Button>
                        <Button
                          onClick={() => {
                            setProfile({ ...profile, name: originalName });
                            setIsEditingName(false);
                          }}
                          variant="outline"
                          className="text-xs px-3 py-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-foreground">{profile.name || "Your Name"}</h1>
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="p-1 hover:bg-muted rounded transition"
                          title="Edit name"
                        >
                          <Edit2 size={18} className="text-muted-foreground" />
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground">{profile.email || "your.email@my.sliit.lk"}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={loading || profile.name === originalName}
                  className=" border border-spacing-10 bg-orange-400 hover:opacity-90 hover:bg-orange-500 text-primary-foreground px-5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
               
              </div>
            </div>

            {/* Stats Cards - conditionally rendered based on role */}
            {role !== "admin" && (
              <div className={`grid gap-4 mb-6 ${role === "student" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2"}`}>
                {role === "student" && (
                  <>
                    <div className="rounded-2xl border border-border p-4 bg-muted/40 text-center">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Registered Sports</p>
                      <p className="text-3xl font-bold text-primary">{profile.registeredSports}</p>
                    </div>
                    <div className="rounded-2xl border border-border p-4 bg-muted/40 text-center">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Active Sessions</p>
                      <p className="text-3xl font-bold text-secondary">{profile.activeSessions}</p>
                    </div>
                  </>
                )}
                {role === "coach" && (
                  <>
                    <div className="rounded-2xl border border-border p-4 bg-muted/40 text-center">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Assigned Sports</p>
                      <p className="text-3xl font-bold text-primary">{profile.assignedSports}</p>
                    </div>
                    <div className="rounded-2xl border border-border p-4 bg-muted/40 text-center">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Active Sessions</p>
                      <p className="text-3xl font-bold text-secondary">{profile.activeSessions}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-border p-5 bg-muted/30">
              <h2 className="text-lg font-semibold text-foreground mb-3">Account Preferences</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center justify-between border border-border px-3 py-3 rounded-lg bg-card">
                  <div>
                    <p className="text-sm font-medium text-foreground">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive all activity updates</p>
                  </div>
                  <input type="checkbox" checked={notifications} onChange={() => setNotifications(!notifications)} className="form-checkbox h-4 w-4 text-primary" />
                </label>
                <label className="flex items-center justify-between border border-border px-3 py-3 rounded-lg bg-card">
                  <div>
                    <p className="text-sm font-medium text-foreground">2FA Security</p>
                    <p className="text-xs text-muted-foreground">Protect account login</p>
                  </div>
                  <input type="checkbox" checked={twoFactor} onChange={() => setTwoFactor(!twoFactor)} className="form-checkbox h-4 w-4 text-secondary" />
                </label>
                <label className="flex items-center justify-between border border-border px-3 py-3 rounded-lg bg-card">
                  <div>
                    <p className="text-sm font-medium text-foreground">Private Profile</p>
                    <p className="text-xs text-muted-foreground">Hide profile from others</p>
                  </div>
                  <input type="checkbox" checked={privateProfile} onChange={() => setPrivateProfile(!privateProfile)} className="form-checkbox h-4 w-4 text-primary" />
                </label>
                <label className="flex items-center justify-between border border-border px-3 py-3 rounded-lg bg-card">
                  <div>
                    <p className="text-sm font-medium text-foreground">Auto Logout</p>
                    <p className="text-xs text-muted-foreground">Auto sign out after inactivity</p>
                  </div>
                  <input type="checkbox" checked={false} disabled className="form-checkbox h-4 w-4 text-primary" />
                </label>
              </div>
            </div>
          </section>

          <section className="surface-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Security Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Current Password</label>
                <Input 
                type="password" 
                placeholder="Current password" 
                value={password.currentPassword} 
                onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} 
                className="w-full bg-background/70 border-border" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">New Password</label>
                <Input 
                type="password" 
                placeholder="New password" 
                value={password.newPassword} 
                onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} 
                className="w-full bg-background/70 border-border" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Confirm New Password</label>
                <Input 
                type="password" 
                placeholder="Confirm password" 
                value={password.confirmPassword} 
                onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })} 
                className="w-full bg-background/70 border-border" />
              </div>

              <Button onClick={handlePasswordUpdate} disabled={loading} className="w-full bg-primary hover:opacity-90 text-primary-foreground py-2">
                {loading ? "Updating password..." : "Update Password"}
              </Button>

              <div className="border border-border rounded-xl p-4 bg-muted/40 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <p className="text-sm">Secure your account with 2FA and regular password changes.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => { logout(); navigate("/"); }} variant="destructive" className="px-5 py-2 rounded-lg border-2 border-red-600 bg-red-600 hover:bg-red-700 hover:border-red-700">
            <LogOut size={16} /> Logout
          </Button>
        </div>
      </div>
    
  );
}
