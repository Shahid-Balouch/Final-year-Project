import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Trash2, X, Pencil, AlertTriangle, Shield, ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { API } from '../../types/dashboard';

type StaffMember = {
  id: string;
  name: string;
  role: string;
  face_embedding: number[];
  allowed_zones: string[];
  allowed_roles: string[];
  active: boolean;
};

type AddMode = 'upload' | 'camera';

const StaffPage: React.FC = () => {
  const { username: _username } = useApp() as any;

  // Staff state
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add modal state
  const [isAdding, setIsAdding] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('upload');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('employee');
  const [newAllowedZones, setNewAllowedZones] = useState('');
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const [isLoadingAdd, setIsLoadingAdd] = useState(false);

  // Camera capture state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [captured, setCaptured] = useState<string | null>(); // base64 dataURL

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editZones, setEditZones] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Load staff ──
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/staff`);
      if (!res.ok) throw new Error('Failed to load staff');
      const data = await res.json();
      setStaff(data.staff || []);
    } catch (e) {
      setError('Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // ── Camera helpers ────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError('');
    setCaptured(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCameraError('Camera access denied or unavailable');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setCaptured(null);
  }, [cameraStream]);

  React.useEffect(() => {
    if (addMode === 'camera' && cameraStream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [addMode, cameraStream]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    setCaptured(canvas.toDataURL('image/jpeg', 0.8));
    stopCamera();
  };

  // ── Add staff ──
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError('Name is required');
      return;
    }
    setIsLoadingAdd(true);
    setError(null);
    try {
      const faceImage = newPreview || captured;
      if (!faceImage) {
        setError('Please provide a face image');
        return;
      }

      const formData = new FormData();
      formData.append('name', newName.trim());
      formData.append('role', newRole);
      formData.append('allowed_zones', newAllowedZones);

      // Convert base64 to blob for upload
      const response = await fetch(faceImage);
      const blob = await response.blob();
      formData.append('image', blob, 'face.jpg');

      const res = await fetch(`${API}/api/staff/register`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to register staff');
      }

      setIsAdding(false);
      setNewName('');
      setNewRole('employee');
      setNewAllowedZones('');
      setNewPreview(null);
      setCaptured(null);
      stopCamera();
      fetchStaff();
    } catch (e: any) {
      setError(e.message || 'Failed to register staff');
    } finally {
      setIsLoadingAdd(false);
    }
  };

  // ── Edit staff ──
  const openEdit = (s: StaffMember) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditRole(s.role);
    setEditZones(Array.isArray(s.allowed_zones) ? s.allowed_zones.join(', ') : String(s.allowed_zones || ''));
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditRole('');
    setEditZones('');
    setEditLoading(false);
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('name', editName.trim());
      formData.append('role', editRole);
      formData.append('allowed_zones', editZones);

      // For edit without new image, we need to send the existing embedding
      // Since we don't have it here, we'll just update name/role/zones
      // The backend endpoint requires image, so we'll need to handle this
      // For now, skip image update in edit mode

      // Use a PATCH-like approach via POST with existing embedding
      // Since backend requires image file, we need to re-upload
      // For simplicity, we'll notify user they need to re-register for face changes
      if (!newPreview && !captured) {
        setError('Face image is required for staff edits. Please re-register.');
        return;
      }

      const faceImage = newPreview || captured;
      if (faceImage) {
        const response = await fetch(faceImage);
        const blob = await response.blob();
        formData.append('image', blob, 'face.jpg');
      }

      const res = await fetch(`${API}/api/staff/register`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to update staff');
      }

      closeEdit();
      fetchStaff();
    } catch (e: any) {
      setError(e.message || 'Failed to update staff');
    } finally {
      setEditLoading(false);
    }
  };

  // ── Delete staff ──
  const handleDeleteStaff = async (id: string) => {
    setDeleteConfirm(null);
    try {
      const res = await fetch(`${API}/api/staff/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete staff');
      fetchStaff();
    } catch (e) {
      setError('Failed to delete staff');
    }
  };

  const roleOptions = [
    { value: 'owner', label: 'Owner' },
    { value: 'manager', label: 'Manager' },
    { value: 'guard', label: 'Guard' },
    { value: 'employee', label: 'Employee' },
  ];

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: '#dc2626',
      manager: '#b45309',
      guard: '#2563eb',
      employee: '#16a34a',
    };
    return {
      bg: `${colors[role] || '#6b7280'}15`,
      color: colors[role] || '#6b7280',
      border: `${colors[role] || '#6b7280'}30`,
    };
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-background)' }}>
      {/* Header */}
      <div className="shrink-0 px-6 py-4 flex flex-col gap-4" style={{ borderBottom: '1px solid var(--color-outline-variant)', background: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2" style={{ background: 'rgba(36,128,255,0.06)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.25rem' }}>
              <Users className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-[0.2em] uppercase" style={{ fontFamily: "'Manrope', sans-serif", color: 'var(--color-on-surface)' }}>
                STAFF MANAGEMENT
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <p className="text-[10px]" style={{ color: 'var(--color-outline)' }}>{staff.length} staff registered</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all rounded-xl"
                style={{ background: 'rgba(186,26,26,0.08)', border: '1px solid rgba(186,26,26,0.25)', color: '#ba1a1a' }}
              >
                <AlertTriangle className="w-3.5 h-3.5" /> {error}
              </div>
            )}
            <button
              onClick={() => { setIsAdding(true); setNewPreview(null); setCaptured(null); stopCamera(); }}
              className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold tracking-widest uppercase transition-all rounded-xl"
              style={{ background: 'rgba(36,128,255,0.06)', border: '1px solid rgba(36,128,255,0.15)', color: 'var(--color-primary)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; (e.currentTarget as HTMLButtonElement).style.color = '#ffffff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(36,128,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary)'; }}
            >
              <Plus className="w-3.5 h-3.5" /> Register Staff
            </button>
          </div>
        </div>
      </div>

      {/* Staff list */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="h-full flex items-center justify-center" style={{ color: 'var(--color-outline-variant)' }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold tracking-widest uppercase">Loading staff...</p>
            </div>
          </div>
        ) : staff.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4" style={{ color: 'var(--color-outline-variant)' }}>
            <Users className="w-14 h-14" />
            <p className="text-sm tracking-[0.3em] font-bold">NO STAFF REGISTERED</p>
            <p className="text-xs" style={{ color: 'rgba(0,0,0,0.1)' }}>
              Register staff members to enable face recognition and zone-based access control.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-4 group cursor-pointer transition-all duration-200 bg-white rounded-2xl"
                style={{ border: '1px solid var(--color-outline-variant)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-primary)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-outline-variant)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'; }}
              >
                <div className="w-12 h-12 shrink-0 overflow-hidden flex items-center justify-center" style={{ borderRadius: '0.5rem', background: 'var(--color-surface-container-low)' }}>
                  <Shield className="w-6 h-6" style={{ color: roleBadge(s.role).color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold" style={{ color: 'var(--color-on-surface)' }}>{s.name}</p>
                    <span className="text-[9px] font-bold tracking-widest px-2 py-0.5" style={{ background: roleBadge(s.role).bg, color: roleBadge(s.role).color, border: `1px solid ${roleBadge(s.role).border}`, borderRadius: '0.125rem' }}>
                      {s.role.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[9px] text-[var(--color-outline)] mt-1 truncate">
                    Zones: {Array.isArray(s.allowed_zones) ? s.allowed_zones.join(', ') : s.allowed_zones || 'none'}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-green-500' : 'bg-red-500'}`} />
                    <p className="text-[9px] font-bold" style={{ color: s.active ? 'var(--color-primary)' : 'var(--color-outline)' }}>
                      {s.active ? 'ACTIVE' : 'INACTIVE'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setDeleteConfirm(s.id); }}
                    className="p-2 transition-all rounded-xl hover:bg-red-50 hover:text-red-600"
                    style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-outline)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    className="p-2 transition-all rounded-xl hover:bg-[var(--color-primary)] hover:text-white"
                    style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-primary)' }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-md flex flex-col overflow-hidden z-10 rounded-3xl"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline-variant)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', maxHeight: '85vh' }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[9px] tracking-[0.3em] font-bold mb-1" style={{ color: 'var(--color-outline)' }}>Register Staff</p>
                    <p className="text-base font-bold uppercase" style={{ color: 'var(--color-on-surface)', fontFamily: "'Manrope', sans-serif" }}>New Staff Member</p>
                  </div>
                  <button onClick={() => setIsAdding(false)} className="p-1.5 transition-all" style={{ color: 'var(--color-outline)' }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddStaff} className="space-y-5">
                  <div className="space-y-3">
                    <label className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'var(--color-outline)' }}>Name</label>
                    <input
                      type="text" value={newName} onChange={e => setNewName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-4 py-2.5 text-xs rounded-xl"
                      style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)', outline: 'none' }}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'var(--color-outline)' }}>Role</label>
                    <select
                      value={newRole} onChange={e => setNewRole(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs rounded-xl"
                      style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)', outline: 'none' }}
                    >
                      {roleOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'var(--color-outline)' }}>Allowed Zones</label>
                    <input
                      type="text" value={newAllowedZones} onChange={e => setNewAllowedZones(e.target.value)}
                      placeholder="Lobby, Server Room, Cash Office"
                      className="w-full px-4 py-2.5 text-xs rounded-xl"
                      style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)', outline: 'none' }}
                    />
                    <p className="text-[9px] text-[var(--color-outline)]">Comma-separated zone labels (e.g., Lobby, Server Room). Leave empty for all zones.</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'var(--color-outline)' }}>Face Photo</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setAddMode('upload'); setNewPreview(null); setCaptured(null); stopCamera(); }}
                        className={`flex-1 py-3 text-[10px] font-bold tracking-widest transition-all rounded-xl ${addMode === 'upload' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-outline-variant)] text-[var(--color-on-surface)]'}`}
                      >
                        Upload Photo
                      </button>
                      <button
                        onClick={() => { setAddMode('camera'); setNewPreview(null); setCaptured(null); startCamera(); }}
                        className={`flex-1 py-3 text-[10px] font-bold tracking-widest transition-all rounded-xl ${addMode === 'camera' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-outline-variant)] text-[var(--color-on-surface)]'}`}
                      >
                        Camera
                      </button>
                    </div>

                    {addMode === 'upload' && (
                      <div className="mt-3">
                        <input
                          type="file" accept="image/*"
                          className="w-full text-xs text-[var(--color-outline)]"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const formData = new FormData();
                            formData.append('file', file);
                            await fetch(`${API}/api/watchlist`, {
                              method: 'POST',
                              body: formData,
                            });
                            // We just need the image data URL for preview
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setNewPreview(ev.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </div>
                    )}

                    {addMode === 'camera' && (
                      <div className="mt-3 space-y-3">
                        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative">
                          <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted />
                          {cameraError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                              <p className="text-sm font-bold">{cameraError}</p>
                              <button onClick={startCamera} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
                            </div>
                          )}
                          {captured && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                              <img src={captured} className="max-w-full max-h-full" alt="Captured" />
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                <button onClick={capturePhoto} className="px-4 py-2 bg-white text-black font-bold rounded">Retake</button>
                                <button onClick={() => { setNewPreview(captured); stopCamera(); }} className="px-4 py-2 bg-green-600 text-white font-bold rounded">Use Photo</button>
                              </div>
                            </div>
                          )}
                        </div>
                        {captured && !newPreview && (
                          <div className="flex justify-end">
                            <button onClick={capturePhoto} className="px-4 py-2 text-xs font-bold tracking-widest uppercase transition-all rounded-xl" style={{ background: 'var(--color-primary)', color: '#ffffff' }}>
                              Retake
                            </button>
                            <button onClick={() => { setNewPreview(captured); stopCamera(); }} className="px-4 py-2 text-xs font-bold tracking-widest uppercase transition-all rounded-xl ml-2" style={{ background: 'var(--color-surface)', color: 'var(--color-on-surface)', border: '1px solid var(--color-outline-variant)' }}>
                              Use Photo
                            </button>
                          </div>
                        )}
                        {!captured && (
                          <div className="mt-3 text-xs text-[var(--color-outline)]">
                            Click "Use Photo" to capture and use this image for staff registration.
                          </div>
                        )}
                      </div>
                    )}

                    {(newPreview || captured) && (
                      <div className="mt-3">
                        <div className="w-32 h-32 rounded-xl overflow-hidden border border-[var(--color-outline-variant)]">
                          <img src={newPreview || captured || ''} className="w-full h-full object-cover" alt="Preview" />
                        </div>
                        <button
                          onClick={() => { setNewPreview(null); setCaptured(null); stopCamera(); }}
                          className="mt-2 text-xs font-bold tracking-widest text-red-600 hover:text-red-800"
                        >
                          Remove photo
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoadingAdd || !newName.trim() || !(newPreview || captured)}
                    className="w-full py-3 text-[10px] font-bold tracking-widest uppercase transition-all rounded-xl"
                    style={{ background: 'var(--color-primary)', color: '#ffffff', border: '1px solid var(--color-primary)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#0d6efd'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}
                  >
                    {isLoadingAdd ? ( <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> ) : ( <div className="flex items-center gap-2"> Register Staff<ArrowRight className="w-3 h-3 ml-2" /> </div> )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Staff Modal */}
      <AnimatePresence>
        {editingId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeEdit}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-md flex flex-col overflow-hidden z-10 rounded-3xl"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline-variant)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', maxHeight: '85vh' }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[9px] tracking-[0.3em] font-bold mb-1" style={{ color: 'var(--color-outline)' }}>Edit Staff</p>
                    <p className="text-base font-bold uppercase" style={{ color: 'var(--color-on-surface)', fontFamily: "'Manrope', sans-serif" }}>{editName}</p>
                  </div>
                  <button onClick={closeEdit} className="p-1.5 transition-all" style={{ color: 'var(--color-outline)' }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleEditStaff} className="space-y-5">
                  <div className="space-y-3">
                    <label className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'var(--color-outline)' }}>Name</label>
                    <input
                      type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs rounded-xl"
                      style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)', outline: 'none' }}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'var(--color-outline)' }}>Role</label>
                    <select
                      value={editRole} onChange={e => setEditRole(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs rounded-xl"
                      style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)', outline: 'none' }}
                    >
                      {roleOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'var(--color-outline)' }}>Allowed Zones</label>
                    <input
                      type="text" value={editZones} onChange={e => setEditZones(e.target.value)}
                      placeholder="Lobby, Server Room"
                      className="w-full px-4 py-2.5 text-xs rounded-xl"
                      style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)', outline: 'none' }}
                    />
                    <p className="text-[9px] text-[var(--color-outline)]">Comma-separated zone labels.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={editLoading}
                    className="w-full py-3 text-[10px] font-bold tracking-widest uppercase transition-all rounded-xl"
                    style={{ background: 'var(--color-primary)', color: '#ffffff', border: '1px solid var(--color-primary)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#0d6efd'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; }}
                  >
                    {editLoading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Update Staff'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-md flex flex-col overflow-hidden z-10 rounded-3xl"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline-variant)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', maxHeight: '85vh' }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[9px] tracking-[0.3em] font-bold mb-1" style={{ color: 'var(--color-outline)' }}>Delete Staff</p>
                    <p className="text-base font-bold uppercase" style={{ color: 'var(--color-on-surface)', fontFamily: "'Manrope', sans-serif" }}>Confirm Deletion</p>
                  </div>
                  <button onClick={() => setDeleteConfirm(null)} className="p-1.5 transition-all" style={{ color: 'var(--color-outline)' }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm" style={{ color: 'var(--color-on-surface)' }}>
                  Are you sure you want to delete this staff member? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-3 text-[10px] font-bold tracking-widest uppercase transition-all rounded-xl"
                    style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(deleteConfirm!)}
                    className="flex-1 py-3 text-[10px] font-bold tracking-widest uppercase transition-all rounded-xl"
                    style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#b91c1c'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#dc2626'; }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StaffPage;
