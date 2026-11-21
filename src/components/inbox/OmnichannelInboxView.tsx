import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Inbox,
  Mail,
  Search,
  Send,
  Bot,
  UserCheck,
  Tag,
  StickyNote,
  Zap,
  Paperclip,
  Reply,
  X,
  Plus,
  Trash2,
  Check,
  CheckCheck,
  ShoppingBag,
  PanelRightOpen,
  PanelRightClose,
  FileText,
  SlidersHorizontal,
  Lock,
  UserPlus,
  Edit3,
  Pin,
  Archive,
  Forward,
  Mic,
  Square,
  Smile,
  Pizza,
  Volume2,
  VolumeX,
  Download,
  Clock,
  BarChart3,
  Sparkles,
  Wand2,
  ArrowRightLeft,
  ShieldBan,
  QrCode,
  FileDown,
  Wifi,
  WifiOff,
  Award,
  Flame,
  Bell,
  Repeat,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Moon,
} from 'lucide-react';
import {
  detectMediaTypeFromFile,
  formatDateSeparator,
  FormattedWhatsAppText,
  getDateKey,
  getMeta24hWindowStatus,
  MESSAGE_REACTIONS,
  playSubtleInboxChime,
  QUICK_EMOJIS,
} from './inboxHelpers';
import {
  detectSentimentAndIntent,
  exportConversationToPdf,
  extractOrderDraftFromText,
  generateCopilotSuggestions,
  getSlaStatus,
  isNightShiftActive,
  loadInboxOpsConfig,
  polishAgentDraft,
  saveInboxOpsConfig,
} from './inboxIntelligence';
import { InboxMetricsModal } from './InboxMetricsModal';
import { InboxOrderBuilderModal } from './InboxOrderBuilderModal';
import { lookupPersonByDni, lookupRucFacturalo } from '../../utils/dniLookup';
import { compressImageFile } from '../../utils/imageCompressor';
import { useSettings } from '../../context/SettingsContext';
import { useRBAC } from '../../context/RBACContext';
import { useOrderCatalog } from '../../context/OrderCatalogContext';
import {
  InboxNoteItem,
  InboxOperationsConfig,
  InboxQuickReply,
  InboxTagItem,
  OmnichannelType,
  WhatsAppChatMessage,
  WhatsAppConversation,
  WhatsAppMessageReplyRef,
} from '../../types/whatsapp';
import {
  INBOX_NOTES_KEY,
  INBOX_QUICK_REPLIES_KEY,
  INBOX_TAGS_KEY,
  WHATSAPP_CONVERSATIONS_KEY,
  interpolateTemplateText,
  loadInboxNotes,
  loadInboxQuickReplies,
  loadInboxTags,
  loadWhatsAppConfig,
  loadWhatsAppConversations,
  loadWhatsAppLogs,
  normalizeWhatsAppPhone,
  runLocalChatbotTurn,
  saveInboxNotes,
  saveInboxQuickReplies,
  saveInboxTags,
  saveWhatsAppConversations,
  sendAgentWhatsAppReply,
} from '../../utils/whatsappService';

type ChannelFilter = 'all' | OmnichannelType;
type RightDrawerTab = 'order' | 'tags' | 'notes';

const CHANNEL_META: Record<
  OmnichannelType,
  { label: string; short: string; color: string; bg: string }
> = {
  whatsapp: {
    label: 'WhatsApp',
    short: 'WA',
    color: '#25D366',
    bg: 'rgba(37, 211, 102, 0.14)',
  },
  facebook: {
    label: 'Messenger',
    short: 'FB',
    color: '#0084FF',
    bg: 'rgba(0, 132, 255, 0.14)',
  },
  instagram: {
    label: 'Instagram',
    short: 'IG',
    color: '#E1306C',
    bg: 'rgba(225, 48, 108, 0.14)',
  },
};

const NOTE_COLORS = ['#fef08a', '#bae6fd', '#bbf7d0', '#fbcfe8', '#ddd6fe'];

interface OmnichannelInboxViewProps {
  onOpenWhatsAppBot?: () => void;
  onMobilePaneChange?: (pane: 'list' | 'chat') => void;
}

export const OmnichannelInboxView: React.FC<OmnichannelInboxViewProps> = ({
  onOpenWhatsAppBot,
  onMobilePaneChange,
}) => {
  const { activeTenant, tenants, branchScope, customization, users, openNoticeModal } = useSettings();
  const { currentUser } = useRBAC();
  const { products, orders, customers, createOrder, upsertCustomer, markOrderPaid } =
    useOrderCatalog();

  const [config] = useState(() => loadWhatsAppConfig());
  const [conversations, setConversations] = useState<WhatsAppConversation[]>(() => {
    const saved = loadWhatsAppConversations();
    if (saved.length > 0) return saved;
    const now = new Date().toISOString();
    const seeded: WhatsAppConversation[] = [
      {
        id: `wa_seed_${activeTenant.id}`,
        channel: 'whatsapp',
        customerPhone: '51999888777',
        customerName: 'Cliente WhatsApp (Simulador)',
        branchId: activeTenant.id,
        controlMode: 'bot',
        currentNodeId: 'welcome',
        pendingStep: null,
        cart: [],
        tags: ['Pedido Activo'],
        unreadCount: 1,
        lastMessageAt: now,
        messages: [
          {
            id: 'wa_init_1',
            sender: 'bot',
            senderName: 'Chatbot Automático',
            text: `¡Hola! Soy el asistente de *${customization.appName}*. Escribe *"Hola"* o pulsa una opción para probar el flujo.`,
            timestamp: now,
            status: 'read',
            interactiveType: 'buttons',
            buttons: [
              { id: 'node:order_catalog', label: 'Hacer un pedido' },
              { id: 'node:order_status', label: 'Seguir mi pedido' },
              { id: 'node:handoff', label: 'Hablar con asesor' },
            ],
          },
        ],
      },
      {
        id: `fb_seed_${activeTenant.id}`,
        channel: 'facebook',
        customerPhone: 'fb_maria_torres',
        customerName: 'María Torres',
        branchId: activeTenant.id,
        controlMode: 'human',
        currentNodeId: 'welcome',
        pendingStep: null,
        cart: [],
        tags: ['Consulta'],
        unreadCount: 1,
        lastMessageAt: now,
        messages: [
          {
            id: 'fb_init_1',
            sender: 'customer',
            senderName: 'María Torres',
            text: 'Hola! Tienen promo de pizza familiar para hoy por Messenger?',
            timestamp: now,
          },
        ],
      },
      {
        id: `ig_seed_${activeTenant.id}`,
        channel: 'instagram',
        customerPhone: '@carlos.pizzalover',
        customerName: 'Carlos Mendoza (@carlos.pizzalover)',
        branchId: activeTenant.id,
        controlMode: 'human',
        currentNodeId: 'welcome',
        pendingStep: null,
        cart: [],
        tags: ['Cliente VIP'],
        unreadCount: 0,
        lastMessageAt: now,
        messages: [
          {
            id: 'ig_init_1',
            sender: 'customer',
            senderName: 'Carlos Mendoza',
            text: 'Vi su historia de la pizza artesanal! Hacen delivery hasta Miraflores?',
            timestamp: now,
          },
        ],
      },
    ];
    saveWhatsAppConversations(seeded);
    return seeded;
  });

  const [tags, setTags] = useState<InboxTagItem[]>(() => loadInboxTags());
  const [quickReplies, setQuickReplies] = useState<InboxQuickReply[]>(() => loadInboxQuickReplies());
  const [notes, setNotes] = useState<InboxNoteItem[]>(() => loadInboxNotes());

  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [listScope, setListScope] = useState<'active' | 'unread' | 'unassigned' | 'archived'>('active');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [opsConfig, setOpsConfig] = useState<InboxOperationsConfig>(() => loadInboxOpsConfig());
  const [logs] = useState(() => loadWhatsAppLogs());
  const [isRealtimeOnline, setIsRealtimeOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [orderBuilderOpen, setOrderBuilderOpen] = useState(false);
  const [orderBuilderPreselect, setOrderBuilderPreselect] = useState<
    Array<{ product: (typeof products)[number]; quantity: number; unitPrice: number }>
  >([]);
  const [orderBuilderAddress, setOrderBuilderAddress] = useState('');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTargetUserId, setTransferTargetUserId] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [chatSummaryText, setChatSummaryText] = useState<string | null>(null);
  const [metaTemplatePickerOpen, setMetaTemplatePickerOpen] = useState(false);
  const [dniLookupStatus, setDniLookupStatus] = useState<string | null>(null);
  const [reminderText, setReminderText] = useState('');
  const [reminderDue, setReminderDue] = useState('');
  const touchStartXRef = useRef<number | null>(null);

  const [draftsByConv, setDraftsByConv] = useState<Record<string, string>>({});
  const [chatInput, setChatInput] = useState('');
  const [inChatSearchOpen, setInChatSearchOpen] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<WhatsAppChatMessage | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; filename?: string } | null>(null);
  const [emojiMenuOpen, setEmojiMenuOpen] = useState(false);
  const [catalogPickerOpen, setCatalogPickerOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [replyingTo, setReplyingTo] = useState<WhatsAppMessageReplyRef | null>(null);
  const [pendingMedia, setPendingMedia] = useState<{
    mediaType: 'image' | 'video' | 'audio' | 'document';
    mediaUrl: string;
    mediaFilename: string;
  } | null>(null);

  const [quickReplyMenuOpen, setQuickReplyMenuOpen] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newMsgChannel, setNewMsgChannel] = useState<OmnichannelType>('whatsapp');
  const [newMsgName, setNewMsgName] = useState('');
  const [newMsgPhone, setNewMsgPhone] = useState('');
  const [newMsgText, setNewMsgText] = useState('');
  const newMessageDialogRef = useRef<HTMLDialogElement>(null);
  const chatHistoryPushedRef = useRef(false);
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list');

  useEffect(() => {
    onMobilePaneChange?.(mobilePane);
    return () => onMobilePaneChange?.('list');
  }, [mobilePane, onMobilePaneChange]);

  // Sync <dialog> for Nuevo Mensaje
  useEffect(() => {
    const dialog = newMessageDialogRef.current;
    if (!dialog) return;
    if (newMessageOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [newMessageOpen]);
  const [rightDrawerOpen, setRightDrawerOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [rightDrawerTab, setRightDrawerTab] = useState<RightDrawerTab>('order');

  // Forms auxiliares
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#10b981');
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteColor, setNewNoteColor] = useState(NOTE_COLORS[0]);
  const [newQrShortcut, setNewQrShortcut] = useState('');
  const [newQrTitle, setNewQrTitle] = useState('');
  const [newQrBody, setNewQrBody] = useState('');
  const [showAddQrForm, setShowAddQrForm] = useState(false);

  // Registro / edición de cliente en CRM desde la bandeja
  const [crmFormOpen, setCrmFormOpen] = useState(false);
  const [crmFullName, setCrmFullName] = useState('');
  const [crmDni, setCrmDni] = useState('');
  const [crmPhone, setCrmPhone] = useState('');
  const [crmEmail, setCrmEmail] = useState('');
  const [crmAddress, setCrmAddress] = useState('');
  const [crmReference, setCrmReference] = useState('');
  const [crmSavedBanner, setCrmSavedBanner] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const updateConversations = (updater: (prev: WhatsAppConversation[]) => WhatsAppConversation[]) => {
    setConversations((prev) => {
      const next = updater(prev);
      saveWhatsAppConversations(next);
      return next;
    });
  };

  const updateOpsConfig = (patch: Partial<InboxOperationsConfig>) => {
    setOpsConfig((prev) => {
      const next = { ...prev, ...patch };
      saveInboxOpsConfig(next);
      return next;
    });
  };

  useEffect(() => {
    const goOnline = () => setIsRealtimeOnline(true);
    const goOffline = () => setIsRealtimeOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Sincronizar en tiempo real conversaciones, etiquetas, notas y respuestas desde otros dispositivos (SSE / polling)
  useEffect(() => {
    const onStorageSync = (e: StorageEvent) => {
      if (!e.key || e.key === WHATSAPP_CONVERSATIONS_KEY) {
        setConversations(loadWhatsAppConversations());
      }
      if (!e.key || e.key === INBOX_TAGS_KEY) {
        setTags(loadInboxTags());
      }
      if (!e.key || e.key === INBOX_QUICK_REPLIES_KEY) {
        setQuickReplies(loadInboxQuickReplies());
      }
      if (!e.key || e.key === INBOX_NOTES_KEY) {
        setNotes(loadInboxNotes());
      }
      if (!e.key || e.key === 'kh_inbox_ops_config_v1') {
        setOpsConfig(loadInboxOpsConfig());
      }
    };
    window.addEventListener('storage', onStorageSync);
    return () => window.removeEventListener('storage', onStorageSync);
  }, []);

  // Filtrado por sucursal + canal + etiqueta + búsqueda
  const branchConversations = useMemo(() => {
    const blocked = new Set(opsConfig.blockedPhones);
    const base =
      branchScope === 'consolidated'
        ? conversations
        : conversations.filter((c) => !c.branchId || c.branchId === activeTenant.id);
    return base.filter((c) => !c.isBlocked && !blocked.has(c.customerPhone));
  }, [conversations, branchScope, activeTenant.id, opsConfig.blockedPhones]);

  const unassignedHumanCount = useMemo(
    () => branchConversations.filter((c) => c.controlMode === 'human' && !c.assignedUserId && !c.isArchived).length,
    [branchConversations]
  );

  const channelCounts = useMemo(() => {
    return {
      all: branchConversations.length,
      whatsapp: branchConversations.filter((c) => c.channel === 'whatsapp').length,
      facebook: branchConversations.filter((c) => c.channel === 'facebook').length,
      instagram: branchConversations.filter((c) => c.channel === 'instagram').length,
    };
  }, [branchConversations]);

  const visibleConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return branchConversations
      .filter((c) => {
        if (listScope === 'archived') {
          if (!c.isArchived) return false;
        } else {
          if (c.isArchived) return false;
          if (listScope === 'unread' && c.unreadCount <= 0) return false;
          if (listScope === 'unassigned' && (c.controlMode !== 'human' || Boolean(c.assignedUserId))) {
            return false;
          }
        }
        if (channelFilter !== 'all' && c.channel !== channelFilter) return false;
        if (tagFilter !== 'all' && !c.tags.includes(tagFilter)) return false;
        if (!q) return true;
        const last = c.messages[c.messages.length - 1]?.text || '';
        return (
          c.customerName.toLowerCase().includes(q) ||
          c.customerPhone.toLowerCase().includes(q) ||
          last.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
        return Date.parse(b.lastMessageAt || '') - Date.parse(a.lastMessageAt || '');
      });
  }, [branchConversations, listScope, channelFilter, tagFilter, searchQuery]);

  const activeConversation = useMemo(() => {
    if (!selectedConvId) return null;
    return (
      visibleConversations.find((c) => c.id === selectedConvId) ||
      branchConversations.find((c) => c.id === selectedConvId) ||
      null
    );
  }, [visibleConversations, branchConversations, selectedConvId]);

  const resetChatUIState = React.useCallback(() => {
    setSelectedConvId('');
    setMobilePane('list');
    setReplyingTo(null);
    setPendingMedia(null);
    setEditingMsgId(null);
    setInChatSearchOpen(false);
    setInChatSearchQuery('');
    setQuickReplyMenuOpen(false);
    setEmojiMenuOpen(false);
    setCatalogPickerOpen(false);
    setCrmFormOpen(false);
  }, []);

  const handleCloseChat = () => {
    resetChatUIState();
    if (chatHistoryPushedRef.current) {
      chatHistoryPushedRef.current = false;
      window.history.back();
    }
  };

  // Intercept Android/iOS system back gesture while inside a mobile chat so it returns to list instead of exiting the ERP
  useEffect(() => {
    if (mobilePane === 'chat' && !chatHistoryPushedRef.current) {
      window.history.pushState({ khInboxChat: true }, '');
      chatHistoryPushedRef.current = true;
    }
  }, [mobilePane]);

  useEffect(() => {
    const onPopState = () => {
      if (chatHistoryPushedRef.current) {
        chatHistoryPushedRef.current = false;
        resetChatUIState();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [resetChatUIState]);

  const handleTogglePin = (convId: string) => {
    updateConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  const handleToggleArchive = (convId: string) => {
    updateConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, isArchived: !c.isArchived } : c))
    );
    if (selectedConvId === convId) handleCloseChat();
  };

  const handleToggleReaction = (msgId: string, emoji: string) => {
    if (!activeConversation) return;
    updateConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConversation.id) return c;
        return {
          ...c,
          messages: c.messages.map((m) => {
            if (m.id !== msgId) return m;
            const current = m.reactions || [];
            const exists = current.includes(emoji);
            return {
              ...m,
              reactions: exists ? current.filter((r) => r !== emoji) : [...current, emoji],
            };
          }),
        };
      })
    );
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!activeConversation) return;
    updateConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConversation.id) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === msgId
              ? { ...m, text: 'Este mensaje fue eliminado', isDeleted: true, mediaUrl: undefined, mediaType: undefined }
              : m
          ),
        };
      })
    );
  };

  const handleStartEditMessage = (msg: WhatsAppChatMessage) => {
    setEditingMsgId(msg.id);
    setChatInput(msg.text);
    setReplyingTo(null);
  };

  const handleForwardToConversation = (targetConvId: string) => {
    if (!forwardingMsg) return;
    const now = new Date().toISOString();
    const fwdMsg: WhatsAppChatMessage = {
      id: `fwd_${Date.now()}`,
      sender: 'agent',
      senderName: currentUser.name,
      text: forwardingMsg.text,
      timestamp: now,
      status: 'delivered',
      mediaType: forwardingMsg.mediaType,
      mediaUrl: forwardingMsg.mediaUrl,
      mediaFilename: forwardingMsg.mediaFilename,
      isForwarded: true,
    };
    updateConversations((prev) =>
      prev.map((c) =>
        c.id === targetConvId
          ? { ...c, lastMessageAt: now, messages: [...c.messages, fwdMsg] }
          : c
      )
    );
    setForwardingMsg(null);
  };

  const handleSendCatalogProduct = (prod: (typeof products)[number]) => {
    if (!activeConversation) return;
    const price = prod.hasSizes && prod.sizes.length > 0 ? prod.sizes[0].price : prod.basePrice;
    const now = new Date().toISOString();
    const msg: WhatsAppChatMessage = {
      id: `prod_${Date.now()}`,
      sender: 'agent',
      senderName: currentUser.name,
      text: `*${prod.name}*\n${prod.description || ''}\n*Precio:* S/ ${price.toFixed(2)}`,
      timestamp: now,
      status: 'delivered',
      mediaType: prod.imageUrl ? 'image' : undefined,
      mediaUrl: prod.imageUrl || undefined,
      mediaFilename: prod.name,
    };
    updateConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, lastMessageAt: now, messages: [...c.messages, msg] }
          : c
      )
    );
    setCatalogPickerOpen(false);
    if (soundEnabled) playSubtleInboxChime();
  };

  const loadFileIntoPendingMedia = async (file: File) => {
    const mediaType = detectMediaTypeFromFile(file);
    const filename = file.name || `archivo_${Date.now()}`;

    if (mediaType === 'image') {
      try {
        const compressed = await compressImageFile(file, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.78,
          outputFormat: 'image/webp',
        });
        setPendingMedia({
          mediaType: 'image',
          mediaUrl: compressed.dataUrl,
          mediaFilename: filename,
        });
        return;
      } catch {
        // Fallback a lectura directa si falla el canvas
      }
    }

    if (file.size > 6 * 1024 * 1024) {
      openNoticeModal({
        title: 'Archivo demasiado pesado',
        message: 'El archivo supera los 6 MB. Comprímelo o usa una versión más ligera para poder sincronizarlo entre dispositivos.',
        tone: 'warning',
        confirmLabel: 'Entendido',
        hideCancel: true,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPendingMedia({
        mediaType,
        mediaUrl: String(reader.result || ''),
        mediaFilename: filename,
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePasteMedia = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i += 1) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          loadFileIntoPendingMedia(file);
          return;
        }
      }
    }
  };

  const handleToggleVoiceRecording = async () => {
    if (isRecordingVoice) {
      mediaRecorderRef.current?.stop();
      setIsRecordingVoice(false);
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordingChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        const reader = new FileReader();
        reader.onload = () => {
          setPendingMedia({
            mediaType: 'audio',
            mediaUrl: String(reader.result || ''),
            mediaFilename: `nota_de_voz_${recordingSeconds}s.webm`,
          });
        };
        reader.readAsDataURL(blob);
        setRecordingSeconds(0);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingSeconds(0);
      setIsRecordingVoice(true);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setIsRecordingVoice(false);
    }
  };

  // Auto-scroll al último mensaje cuando cambia la conversación o llegan mensajes nuevos
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.id, activeConversation?.messages.length]);

  const appendAuditEvent = (convId: string, action: string) => {
    updateConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              auditTrail: [
                ...(c.auditTrail || []),
                {
                  id: `aud_${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  actor: currentUser.name,
                  action,
                },
              ].slice(-25),
            }
          : c
      )
    );
  };

  const sendDirectAgentMessage = async (conv: WhatsAppConversation, rawText: string) => {
    const signedText = opsConfig.signMessagesWithAgentName
      ? `*${currentUser.name}:* ${rawText}`
      : rawText;
    const now = new Date().toISOString();
    const msg: WhatsAppChatMessage = {
      id: `agent_${Date.now()}`,
      sender: 'agent',
      senderName: currentUser.name,
      text: signedText,
      timestamp: now,
      status: 'delivered',
    };
    updateConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id
          ? { ...c, lastMessageAt: now, messages: [...c.messages, msg] }
          : c
      )
    );
    if (conv.channel === 'whatsapp') {
      void sendAgentWhatsAppReply({
        config,
        branchId: conv.branchId || activeTenant.id,
        toPhone: conv.customerPhone,
        text: signedText,
      });
    }
    if (soundEnabled) playSubtleInboxChime();
  };

  const handleQuickDniRucLookup = async () => {
    const clean = crmDni.replace(/\D/g, '');
    if (clean.length === 8) {
      setDniLookupStatus('Consultando RENIEC...');
      const res = await lookupPersonByDni(clean, customers);
      if (res.found) {
        if (res.fullName) setCrmFullName(res.fullName);
        if (res.address) setCrmAddress(res.address);
        setDniLookupStatus('Nombre completado desde RENIEC/CRM');
      } else {
        setDniLookupStatus('No encontrado en padrón');
      }
      return;
    }
    if (clean.length === 11) {
      setDniLookupStatus('Consultando SUNAT...');
      const res = await lookupRucFacturalo(clean);
      if (res.success && res.razonSocial) {
        setCrmFullName(res.razonSocial);
        if (res.direccion) setCrmAddress(res.direccion);
        setDniLookupStatus('Razón social completada desde SUNAT');
      } else {
        setDniLookupStatus('RUC no encontrado');
      }
      return;
    }
    setDniLookupStatus('Ingresa 8 dígitos (DNI) u 11 (RUC)');
  };

  const handleTransferChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !transferTargetUserId || !transferNote.trim()) return;
    const targetUser = users.find((u) => u.id === transferTargetUserId);
    const noteItem: InboxNoteItem = {
      id: `note_tr_${Date.now()}`,
      conversationId: activeConversation.id,
      authorName: currentUser.name,
      content: `Transferido a ${targetUser?.name || transferTargetUserId}: ${transferNote.trim()}`,
      color: '#bae6fd',
      createdAt: new Date().toISOString(),
    };
    const nextNotes = [noteItem, ...notes];
    setNotes(nextNotes);
    saveInboxNotes(nextNotes);

    updateConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              assignedUserId: transferTargetUserId,
              controlMode: 'human',
              auditTrail: [
                ...(c.auditTrail || []),
                {
                  id: `aud_${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  actor: currentUser.name,
                  action: `Transfirió chat a ${targetUser?.name || 'asesor'}`,
                },
              ],
            }
          : c
      )
    );
    setTransferModalOpen(false);
    setTransferNote('');
  };

  const handleBlockCurrentContact = () => {
    if (!activeConversation) return;
    const nextBlocked = Array.from(
      new Set([...opsConfig.blockedPhones, activeConversation.customerPhone])
    );
    updateOpsConfig({ blockedPhones: nextBlocked });
    updateConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? { ...c, isBlocked: true } : c))
    );
    handleCloseChat();
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !reminderText.trim()) return;
    const item = {
      id: `rem_${Date.now()}`,
      text: reminderText.trim(),
      dueAt: reminderDue || new Date(Date.now() + 3_600_000).toISOString().slice(0, 16),
      done: false,
    };
    updateConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, reminders: [item, ...(c.reminders || [])] }
          : c
      )
    );
    setReminderText('');
    setReminderDue('');
  };

  const handleSummarizeConversation = () => {
    if (!activeConversation) return;
    const customerMsgs = activeConversation.messages.filter((m) => m.sender === 'customer');
    const lastTwo = customerMsgs.slice(-2).map((m) => `"${m.text}"`).join(' | ');
    const lastText = customerMsgs[customerMsgs.length - 1]?.text || '';
    const { intent, sentiment } = detectSentimentAndIntent(lastText);
    setChatSummaryText(
      `Resumen IA (${customerMsgs.length} msgs del cliente): Intención: ${intent} · Sentimiento: ${
        sentiment === 'angry' ? 'Molesto ⚠️' : sentiment === 'positive' ? 'Positivo 😊' : 'Neutral'
      }. Último: ${lastTwo || 'Sin mensajes recientes.'}`
    );
  };

  const handleOpenOrderFromDetectedText = () => {
    if (!activeConversation) return;
    const allCustomerText = activeConversation.messages
      .filter((m) => m.sender === 'customer')
      .map((m) => m.text)
      .join('\n');
    const extracted = extractOrderDraftFromText(allCustomerText, products);
    setOrderBuilderPreselect(extracted.items);
    setOrderBuilderAddress(extracted.detectedAddress || linkedCustomer?.address || '');
    setOrderBuilderOpen(true);
  };

  const handleMarkUnreadAndClose = (convId: string) => {
    updateConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unreadCount: Math.max(1, c.unreadCount) } : c))
    );
    handleCloseChat();
  };

  // Atajo Escape para cerrar el chat abierto al instante (igual que WhatsApp Web / Apple Messages)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedConvId) {
        if (quickReplyMenuOpen) {
          setQuickReplyMenuOpen(false);
          return;
        }
        handleCloseChat();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedConvId, quickReplyMenuOpen]);

  // Cliente CRM vinculado por teléfono WhatsApp
  const linkedCustomer = useMemo(() => {
    if (!activeConversation) return null;
    const phone = normalizeWhatsAppPhone(activeConversation.customerPhone);
    if (!phone || phone.length < 7) return null;
    return (
      customers.find((c) => normalizeWhatsAppPhone(c.whatsapp) === phone) || null
    );
  }, [activeConversation, customers]);

  const openCrmRegistrationForm = () => {
    if (!activeConversation) return;
    setCrmFullName(linkedCustomer?.fullName || activeConversation.customerName || '');
    setCrmDni(linkedCustomer?.dni || '');
    setCrmPhone(linkedCustomer?.whatsapp || activeConversation.customerPhone || '');
    setCrmEmail(linkedCustomer?.email || '');
    setCrmAddress(linkedCustomer?.address || '');
    setCrmReference(linkedCustomer?.reference || '');
    setCrmFormOpen(true);
  };

  const handleSaveCrmCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !crmFullName.trim()) return;
    const saved = upsertCustomer(
      {
        id: linkedCustomer?.id,
        fullName: crmFullName.trim(),
        dni: crmDni.trim(),
        whatsapp: crmPhone.trim() || activeConversation.customerPhone,
        email: crmEmail.trim(),
        address: crmAddress.trim(),
        reference: crmReference.trim(),
        tenantId: activeConversation.branchId || activeTenant.id,
      },
      true
    );
    updateConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              customerName: saved.fullName,
              customerPhone: saved.whatsapp || c.customerPhone,
            }
          : c
      )
    );
    setCrmFormOpen(false);
    setCrmSavedBanner('Cliente guardado en CRM');
    setTimeout(() => setCrmSavedBanner(null), 2600);
  };

  // KPIs del cliente en CRM (Total gastado, Ticket promedio, Frecuencia, Pizza favorita, Última compra)
  const linkedCustomerKpis = useMemo(() => {
    if (!activeConversation) return null;
    const phone = normalizeWhatsAppPhone(activeConversation.customerPhone);
    const history = orders.filter(
      (o) =>
        (activeConversation.linkedOrderNumber && o.orderNumber === activeConversation.linkedOrderNumber) ||
        (phone && phone.length >= 9 && normalizeWhatsAppPhone(o.customerPhone) === phone)
    );
    if (history.length === 0) return null;
    const totalSpent = history.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const avgTicket = totalSpent / history.length;
    const productCounts = new Map<string, number>();
    for (const o of history) {
      for (const it of o.items) {
        productCounts.set(it.productName, (productCounts.get(it.productName) || 0) + it.quantity);
      }
    }
    let favoritePizza = '';
    let maxQty = 0;
    productCounts.forEach((qty, name) => {
      if (qty > maxQty) {
        maxQty = qty;
        favoritePizza = name;
      }
    });
    return {
      orderCount: history.length,
      totalSpent,
      avgTicket,
      favoritePizza,
      lastOrderDate: history[0]?.createdAt,
    };
  }, [activeConversation, orders]);

  // Pedidos del ERP vinculados al cliente activo
  const linkedOrders = useMemo(() => {
    if (!activeConversation) return [];
    const phone = normalizeWhatsAppPhone(activeConversation.customerPhone);
    return orders
      .filter((o) => {
        if (activeConversation.linkedOrderNumber && o.orderNumber === activeConversation.linkedOrderNumber) {
          return true;
        }
        return phone && phone.length >= 9 && normalizeWhatsAppPhone(o.customerPhone) === phone;
      })
      .slice(0, 5);
  }, [activeConversation, orders]);

  const activeConversationNotes = useMemo(
    () => (activeConversation ? notes.filter((n) => n.conversationId === activeConversation.id) : []),
    [notes, activeConversation]
  );

  const filteredQuickReplies = useMemo(() => {
    if (!chatInput.startsWith('/')) return quickReplies;
    const q = chatInput.toLowerCase();
    return quickReplies.filter(
      (qr) => qr.shortcut.toLowerCase().includes(q) || qr.title.toLowerCase().includes(q)
    );
  }, [quickReplies, chatInput]);

  const handleSelectConversation = (convId: string) => {
    if (selectedConvId) {
      setDraftsByConv((prev) => ({ ...prev, [selectedConvId]: chatInput }));
    }
    setSelectedConvId(convId);
    setChatInput(draftsByConv[convId] || '');
    setReplyingTo(null);
    setEditingMsgId(null);
    setInChatSearchOpen(false);
    setInChatSearchQuery('');
    setMobilePane('chat');
    updateConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleAttachFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadFileIntoPendingMedia(file);
    e.target.value = '';
  };

  const handleApplyQuickReply = (qr: InboxQuickReply) => {
    const storeUrl = config.storefrontBaseUrl || window.location.origin;
    const resolved = interpolateTemplateText(qr.body, {
      link_tienda: storeUrl,
      marca: customization.appName,
      cliente: activeConversation?.customerName || 'Cliente',
    });
    setChatInput(resolved);
    setQuickReplyMenuOpen(false);
  };

  const handleSendTurn = async (textOverride?: string, buttonId?: string) => {
    if (!activeConversation) return;
    const text = (textOverride ?? chatInput).trim();
    if (!text && !buttonId && !pendingMedia) return;

    // Si estamos editando un mensaje existente
    if (editingMsgId && text) {
      updateConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === editingMsgId ? { ...m, text, isEdited: true } : m
                ),
              }
            : c
        )
      );
      setEditingMsgId(null);
      setChatInput('');
      return;
    }

    setChatInput('');
    setDraftsByConv((prev) => ({ ...prev, [activeConversation.id]: '' }));
    setQuickReplyMenuOpen(false);
    setEmojiMenuOpen(false);
    setCatalogPickerOpen(false);
    const replyRef = replyingTo;
    const mediaPayload = pendingMedia;
    setReplyingTo(null);
    setPendingMedia(null);

    // 1. Si está en modo Asesor Humano (y no es clic de botón simulado), se envía como respuesta de agente
    if (activeConversation.controlMode === 'human' && !buttonId) {
      if (opsConfig.agentStatus === 'readonly') return;
      const bodyWithSignature =
        opsConfig.signMessagesWithAgentName && text ? `*${currentUser.name}:* ${text}` : text;
      const msg: WhatsAppChatMessage = {
        id: `agent_${Date.now()}`,
        sender: 'agent',
        senderName: currentUser.name,
        text: bodyWithSignature || (mediaPayload ? `Adjunto: ${mediaPayload.mediaFilename}` : ''),
        timestamp: new Date().toISOString(),
        status: 'delivered',
        replyTo: replyRef || undefined,
        mediaType: mediaPayload?.mediaType,
        mediaUrl: mediaPayload?.mediaUrl,
        mediaFilename: mediaPayload?.mediaFilename,
      };
      updateConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, lastMessageAt: msg.timestamp, messages: [...c.messages, msg] }
            : c
        )
      );
      if (soundEnabled) playSubtleInboxChime();

      if (activeConversation.channel === 'whatsapp') {
        void sendAgentWhatsAppReply({
          config,
          branchId: activeConversation.branchId || activeTenant.id,
          toPhone: activeConversation.customerPhone,
          text: msg.text,
        });
      }
      return;
    }

    // 2. Si está en modo Bot 24/7, simula el mensaje del cliente y ejecuta el motor de flujos
    const incomingMsg: WhatsAppChatMessage = {
      id: `cust_${Date.now()}`,
      sender: 'customer',
      senderName: activeConversation.customerName,
      text: text || buttonId || (mediaPayload ? mediaPayload.mediaFilename : ''),
      timestamp: new Date().toISOString(),
      replyTo: replyRef || undefined,
      mediaType: mediaPayload?.mediaType,
      mediaUrl: mediaPayload?.mediaUrl,
      mediaFilename: mediaPayload?.mediaFilename,
    };

    const convWithIncoming: WhatsAppConversation = {
      ...activeConversation,
      lastMessageAt: incomingMsg.timestamp,
      messages: [...activeConversation.messages, incomingMsg],
    };

    const latestConfig = loadWhatsAppConfig();
    if (!latestConfig.autoReplyEnabled) {
      updateConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? convWithIncoming : c))
      );
      return;
    }

    const turn = runLocalChatbotTurn({
      config: latestConfig,
      conversation: convWithIncoming,
      userText: text,
      buttonId,
      brandName: customization.appName,
      branches: tenants.map((t) => ({ id: t.id, name: t.name, address: t.operations?.address })),
      products,
      orders,
    });

    let createdOrderNumber: string | undefined;
    if (turn.createdOrderPayload && turn.createdOrderPayload.cart.length > 0) {
      const subtotal = turn.createdOrderPayload.cart.reduce(
        (s, i) => s + i.unitPrice * i.quantity,
        0
      );
      const isPickup = turn.createdOrderPayload.deliveryAddress.toLowerCase().includes('recojo');
      const created = createOrder({
        tenantId: turn.createdOrderPayload.branchId,
        channel: isPickup ? 'pos-takeaway' : 'online',
        customerName: turn.createdOrderPayload.customerName,
        customerPhone: turn.createdOrderPayload.customerPhone,
        deliveryAddress: turn.createdOrderPayload.deliveryAddress,
        deliveryReference: `Pedido tomado por Chatbot (${CHANNEL_META[activeConversation.channel].label})`,
        paymentMethod: 'yape_plin',
        paymentStatus: 'pendiente',
        subtotal,
        deliveryFee: 0,
        discount: 0,
        total: subtotal,
        estimatedMinutes: 30,
        items: turn.createdOrderPayload.cart.map((item, idx) => ({
          itemId: `wa_item_${Date.now()}_${idx}`,
          productId: item.productId,
          productName: item.productName,
          productImage: products.find((p) => p.id === item.productId)?.imageUrl || '',
          subOptions: [],
          extras: [],
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          totalPrice: item.unitPrice * item.quantity,
        })),
      });
      createdOrderNumber = created.orderNumber;
    }

    const botMsg: WhatsAppChatMessage = {
      id: `bot_${Date.now() + 1}`,
      sender: 'bot',
      senderName: 'Chatbot Automático',
      text: createdOrderNumber
        ? `${turn.replyText}\n\n*Comanda ERP:* ${createdOrderNumber}`
        : turn.replyText,
      timestamp: new Date().toISOString(),
      status: 'read',
      interactiveType: turn.interactiveType,
      buttons: turn.buttons,
    };

    const { sentiment, intent } = detectSentimentAndIntent(incomingMsg.text);
    const autoTagged = Array.from(
      new Set([
        ...convWithIncoming.tags,
        ...(mediaPayload?.mediaType === 'image' ? ['Pendiente Pago'] : []),
        ...(sentiment === 'angry' ? ['Reclamo'] : []),
      ])
    );

    const nextTags = createdOrderNumber
      ? Array.from(new Set([...autoTagged, 'Pedido Activo']))
      : autoTagged;

    const finalConv: WhatsAppConversation = {
      ...turn.updatedConversation,
      tags: nextTags,
      sentiment,
      detectedIntent: intent,
      lastCustomerMessageAt: incomingMsg.timestamp,
      linkedOrderNumber: createdOrderNumber || turn.updatedConversation.linkedOrderNumber,
      lastMessageAt: botMsg.timestamp,
      messages: [...convWithIncoming.messages, botMsg],
    };

    if (sentiment === 'angry' && typeof document !== 'undefined' && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`Atención urgente: ${activeConversation.customerName}`, {
        body: incomingMsg.text.slice(0, 100),
      });
    }

    updateConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? finalConv : c))
    );
  };

  const handleCreateNewMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newMsgName.trim();
    const cleanPhone = newMsgPhone.trim();
    if (!cleanName || !cleanPhone) return;

    const existing = conversations.find(
      (c) =>
        c.channel === newMsgChannel &&
        c.customerPhone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '') &&
        cleanPhone.replace(/\D/g, '').length >= 6
    );

    const firstText = newMsgText.trim();
    const nowIso = new Date().toISOString();

    if (existing) {
      if (firstText) {
        const msg: WhatsAppChatMessage = {
          id: `agent_${Date.now()}`,
          sender: 'agent',
          senderName: currentUser.name,
          text: firstText,
          timestamp: nowIso,
          status: 'sent',
        };
        updateConversations((prev) =>
          prev.map((c) =>
            c.id === existing.id
              ? {
                  ...c,
                  controlMode: 'human',
                  assignedUserId: c.assignedUserId || currentUser.id,
                  isArchived: false,
                  lastMessageAt: nowIso,
                  messages: [...c.messages, msg],
                }
              : c
          )
        );
      }
      setSelectedConvId(existing.id);
      setMobilePane('chat');
      setChannelFilter('all');
      setNewMessageOpen(false);
      setNewMsgName('');
      setNewMsgPhone('');
      setNewMsgText('');
      return;
    }

    const id = `${newMsgChannel}_${Date.now()}`;
    const newConv: WhatsAppConversation = {
      id,
      channel: newMsgChannel,
      customerPhone: cleanPhone,
      customerName: cleanName,
      branchId: activeTenant.id,
      controlMode: 'human',
      assignedUserId: currentUser.id,
      currentNodeId: 'welcome',
      pendingStep: null,
      cart: [],
      tags: ['Consulta'],
      unreadCount: 0,
      lastMessageAt: nowIso,
      messages: firstText
        ? [
            {
              id: `agent_${Date.now()}`,
              sender: 'agent',
              senderName: currentUser.name,
              text: firstText,
              timestamp: nowIso,
              status: 'sent',
            },
          ]
        : [],
    };
    updateConversations((prev) => [newConv, ...prev]);
    setSelectedConvId(id);
    setMobilePane('chat');
    setChannelFilter('all');
    setNewMessageOpen(false);
    setNewMsgName('');
    setNewMsgPhone('');
    setNewMsgText('');
  };

  const handleToggleControlMode = (convId: string) => {
    updateConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const nextMode = c.controlMode === 'bot' ? 'human' : 'bot';
        let nextAssigned = c.assignedUserId;
        if (nextMode === 'human' && !nextAssigned) {
          if (opsConfig.roundRobinEnabled && users.length > 0) {
            const idx = Math.floor(Math.random() * users.length);
            nextAssigned = users[idx].id;
          } else if (opsConfig.agentStatus === 'available') {
            nextAssigned = currentUser.id;
          }
        }
        return {
          ...c,
          controlMode: nextMode,
          assignedUserId: nextAssigned,
          activeViewerName: nextMode === 'human' ? currentUser.name : undefined,
          pausedUntil:
            nextMode === 'human'
              ? new Date(Date.now() + (opsConfig.autoReactivateBotMinutes || 30) * 60_000).toISOString()
              : undefined,
          auditTrail: [
            ...(c.auditTrail || []),
            {
              id: `aud_${Date.now()}`,
              timestamp: new Date().toISOString(),
              actor: currentUser.name,
              action: nextMode === 'human' ? 'Tomó control humano' : 'Reactivó Chatbot 24/7',
            },
          ].slice(-25),
        };
      })
    );
  };

  const handleToggleTagOnConv = (tagName: string) => {
    if (!activeConversation) return;
    updateConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConversation.id) return c;
        const exists = c.tags.includes(tagName);
        return {
          ...c,
          tags: exists ? c.tags.filter((t) => t !== tagName) : [...c.tags, tagName],
        };
      })
    );
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTagName.trim();
    if (!clean) return;
    if (tags.some((t) => t.name.toLowerCase() === clean.toLowerCase())) {
      return;
    }
    const next = [...tags, { id: `tag_${Date.now()}`, name: clean, color: newTagColor }];
    setTags(next);
    saveInboxTags(next);
    setNewTagName('');
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !newNoteText.trim()) return;
    const item: InboxNoteItem = {
      id: `note_${Date.now()}`,
      conversationId: activeConversation.id,
      authorName: currentUser.name,
      content: newNoteText.trim(),
      color: newNoteColor,
      createdAt: new Date().toISOString(),
    };
    const next = [item, ...notes];
    setNotes(next);
    saveInboxNotes(next);
    setNewNoteText('');
  };

  const handleDeleteNote = (noteId: string) => {
    const next = notes.filter((n) => n.id !== noteId);
    setNotes(next);
    saveInboxNotes(next);
  };

  const handleCreateQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    const sc = newQrShortcut.trim().startsWith('/')
      ? newQrShortcut.trim()
      : `/${newQrShortcut.trim()}`;
    if (!newQrShortcut.trim() || !newQrBody.trim()) return;
    const item: InboxQuickReply = {
      id: `qr_${Date.now()}`,
      shortcut: sc,
      title: newQrTitle.trim() || sc,
      body: newQrBody.trim(),
    };
    const next = [...quickReplies, item];
    setQuickReplies(next);
    saveInboxQuickReplies(next);
    setNewQrShortcut('');
    setNewQrTitle('');
    setNewQrBody('');
    setShowAddQrForm(false);
  };

  const handleDeleteQuickReply = (id: string) => {
    const next = quickReplies.filter((q) => q.id !== id);
    setQuickReplies(next);
    saveInboxQuickReplies(next);
  };

  const getTagColor = (name: string) =>
    tags.find((t) => t.name.toLowerCase() === name.toLowerCase())?.color || '#6366f1';

  const getInitials = (name: string) => {
    const parts = name.replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'CL';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  return (
    <div className="w-full h-full">
      {/* Workspace Omnicanal Full-Height (Apple Design + Responsive tipo WhatsApp) */}
      <div className="relative saas-card !rounded-none lg:!rounded-2xl !border-0 lg:!border overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-full bg-white dark:bg-zinc-950">
        {/* COLUMNA IZQUIERDA: FILTROS + CONVERSACIONES */}
        <div
          className={`${
            mobilePane === 'chat' ? 'hidden lg:flex' : 'flex'
          } lg:col-span-4 xl:col-span-3 border-r border-zinc-200/80 dark:border-zinc-800/80 flex-col min-h-0 h-full bg-white dark:bg-zinc-950`}
        >
          {/* Cabecera translúcida de la lista: Segmented Control iOS + Spotlight Search */}
          <div className="shrink-0 px-3 pt-3 pb-2.5 space-y-2.5 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-200/70 dark:border-zinc-800/70">
            {/* iOS Segmented Control de Canales (Solo PC; en móvil pasa a Navbar inferior) */}
            <div className="hidden lg:grid grid-cols-4 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
              {(
                [
                  { id: 'all', label: 'Todos', count: channelCounts.all, color: customization.primaryColor },
                  { id: 'whatsapp', label: 'WA', count: channelCounts.whatsapp, color: '#25D366' },
                  { id: 'facebook', label: 'FB', count: channelCounts.facebook, color: '#0084FF' },
                  { id: 'instagram', label: 'IG', count: channelCounts.instagram, color: '#E1306C' },
                ] as const
              ).map((ch) => {
                const active = channelFilter === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setChannelFilter(ch.id)}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all active:scale-[0.97] flex items-center justify-center gap-1 ${
                      active
                        ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: ch.color, opacity: active ? 1 : 0.45 }}
                    />
                    <span>{ch.label}</span>
                    <span className="text-[10px] tabular-nums opacity-65">{ch.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Buscador estilo Spotlight + Botón Nuevo Mensaje */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar conversación..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-100/90 dark:bg-zinc-900 text-base sm:text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={() => setNewMessageOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-semibold text-white active:scale-[0.96] transition-transform duration-100 ease-out whitespace-nowrap shrink-0 shadow-sm"
                style={{ backgroundColor: customization.primaryColor }}
                title="Iniciar nueva conversación"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Nuevo</span>
              </button>
            </div>

            {/* Filtro de estado estético (Segmented Pill Strip) */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-100/90 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/80 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'active', label: 'Activos' },
                  { id: 'unread', label: 'Sin leer' },
                  { id: 'unassigned', label: 'Sin asignar', badge: unassignedHumanCount },
                  { id: 'archived', label: 'Archivados' },
                ] as const
              ).map((sc) => {
                const isSelectedScope = listScope === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setListScope(sc.id)}
                    className={`flex-1 min-w-fit px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-100 ease-out active:scale-[0.97] inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      isSelectedScope
                        ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm ring-1 ring-zinc-900/5 dark:ring-white/10'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <span>{sc.label}</span>
                    {'badge' in sc && sc.badge > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold tabular-nums ${
                          isSelectedScope
                            ? 'bg-rose-500 text-white'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {sc.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Filtro de etiqueta + Indicadores compactos (Realtime / SLA / Sonido) */}
            <div className="flex items-center gap-1.5">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-900 border border-transparent text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none"
              >
                <option value="all">Todas las etiquetas</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 shrink-0">
                <span
                  className={`p-1.5 rounded-lg ${isRealtimeOnline ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`}
                  title={isRealtimeOnline ? 'En línea (tiempo real)' : 'Reconectando...'}
                >
                  {isRealtimeOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                </span>
                <button
                  type="button"
                  onClick={() => setMetricsModalOpen(true)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white active:scale-95 transition-transform"
                  title="Métricas SLA, BI y Operación"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSoundEnabled((s) => !s)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white active:scale-95 transition-transform"
                  title={soundEnabled ? 'Silenciar sonido' : 'Activar sonido sutil'}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Conversaciones (estilo iOS Messages) */}
          <div className="flex-1 overflow-y-auto overscroll-contain pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
            {visibleConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                No hay conversaciones con estos filtros.
              </div>
            ) : (
              visibleConversations.map((conv, idx) => {
                const isSelected = activeConversation?.id === conv.id;
                const chMeta = CHANNEL_META[conv.channel];
                const lastMsg = conv.messages[conv.messages.length - 1];
                const sla = getSlaStatus(conv);
                const timeLabel = lastMsg
                  ? new Date(lastMsg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                return (
                  <div
                    key={conv.id}
                    onTouchStart={(e) => {
                      touchStartXRef.current = e.touches[0]?.clientX ?? null;
                    }}
                    onTouchEnd={(e) => {
                      const startX = touchStartXRef.current;
                      const endX = e.changedTouches[0]?.clientX;
                      touchStartXRef.current = null;
                      if (startX === null || endX === undefined) return;
                      const delta = endX - startX;
                      if (delta > 65) {
                        updateConversations((prev) =>
                          prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: Math.max(1, c.unreadCount) } : c))
                        );
                      } else if (delta < -65) {
                        handleToggleArchive(conv.id);
                      }
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`w-full text-left px-3.5 py-3 transition-all active:scale-[0.99] flex items-center gap-3 ${
                        isSelected
                          ? 'bg-emerald-500/[0.09] dark:bg-emerald-500/15'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/70'
                      }`}
                    >
                      {/* Avatar circular con badge de canal */}
                      <div className="relative shrink-0">
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold tracking-tight"
                          style={{
                            backgroundColor: chMeta.bg,
                            color: chMeta.color,
                          }}
                        >
                          {getInitials(conv.customerName)}
                        </div>
                        <span
                          className="absolute -bottom-0.5 -right-0.5 px-1 py-[1px] rounded-full text-[8px] font-extrabold text-white ring-2 ring-white dark:ring-zinc-950 leading-none"
                          style={{ backgroundColor: chMeta.color }}
                        >
                          {chMeta.short}
                        </span>
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[13px] tracking-[-0.01em] text-zinc-950 dark:text-white truncate flex items-center gap-1">
                            {conv.isPinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
                            <span className="truncate">{conv.customerName}</span>
                          </span>
                          <span className="text-[11px] tabular-nums text-zinc-400 shrink-0">
                            {timeLabel}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate leading-snug">
                            {lastMsg?.text || 'Sin mensajes'}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span
                              className="min-w-[18px] h-[18px] px-1.5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 tabular-nums"
                              style={{ backgroundColor: chMeta.color }}
                            >
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                              conv.controlMode === 'bot'
                                ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                conv.controlMode === 'bot' ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            />
                            {conv.controlMode === 'bot' ? 'Bot 24/7' : 'Asesor'}
                          </span>
                          {sla.label && (
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                                sla.level === 'critical'
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                  : sla.level === 'warning'
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {sla.label}
                            </span>
                          )}
                          {conv.sentiment === 'angry' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600">
                              Urgente
                            </span>
                          )}
                          {conv.tags.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: getTagColor(t) }}
                              />
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                    {idx < visibleConversations.length - 1 && (
                      <div className="ml-[68px] border-b border-zinc-100 dark:border-zinc-800/70" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMNA CENTRAL: CHAT EN VIVO */}
        <div
          className={`${
            mobilePane === 'list' ? 'hidden lg:flex' : 'flex'
          } ${
            rightDrawerOpen && activeConversation
              ? 'lg:col-span-5 xl:col-span-6'
              : 'lg:col-span-8 xl:col-span-9'
          } flex-col min-h-0 min-w-0 overflow-x-hidden h-full transition-all duration-300 ease-out motion-reduce:transition-none ${
            opsConfig.chatBackground === 'whatsapp_pattern'
              ? 'bg-[#efeae2]/70 dark:bg-zinc-950/90'
              : 'bg-zinc-50/70 dark:bg-zinc-950/60'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Cabecera del chat profesional (1 línea limpia + material translúcido Apple + safe area móvil) */}
              <div className="shrink-0 px-3 sm:px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top,0px))] lg:pt-2.5 border-b border-zinc-200/70 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={handleCloseChat}
                    className="lg:hidden min-w-[40px] min-h-[40px] -ml-1.5 rounded-full text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.94] transition-all shrink-0 flex items-center justify-center"
                    title="Volver a la lista de chats"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* Avatar + indicador canal */}
                  <div className="relative shrink-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: CHANNEL_META[activeConversation.channel].bg,
                        color: CHANNEL_META[activeConversation.channel].color,
                      }}
                    >
                      {getInitials(activeConversation.customerName)}
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 px-1 py-[1px] rounded-full text-[7px] font-extrabold text-white ring-2 ring-white dark:ring-zinc-900 leading-none"
                      style={{ backgroundColor: CHANNEL_META[activeConversation.channel].color }}
                    >
                      {CHANNEL_META[activeConversation.channel].short}
                    </span>
                  </div>

                  {/* Nombre y estado */}
                  <div className="min-w-0">
                    <h2 className="font-semibold text-[14px] tracking-[-0.015em] text-zinc-950 dark:text-white truncate leading-tight">
                      {activeConversation.customerName}
                    </h2>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          activeConversation.controlMode === 'bot' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      <span className="truncate">
                        {activeConversation.controlMode === 'bot'
                          ? 'Bot 24/7 activo'
                          : `Control humano${
                              activeConversation.assignedUserId
                                ? ` · ${users.find((u) => u.id === activeConversation.assignedUserId)?.name || ''}`
                                : ''
                            }`}
                        <span className="hidden sm:inline font-mono">
                          {' '}· {activeConversation.customerPhone}
                        </span>
                        {activeConversation.activeViewerName && (
                          <span className="hidden xl:inline text-emerald-600 dark:text-emerald-400">
                            {' '}· {activeConversation.activeViewerName} viendo
                          </span>
                        )}
                      </span>
                      {activeConversation.sentiment === 'angry' && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-600 shrink-0">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Molesto
                        </span>
                      )}
                      {activeConversation.channel === 'whatsapp' && (() => {
                        const win = getMeta24hWindowStatus(activeConversation.lastCustomerMessageAt || activeConversation.lastMessageAt);
                        return (
                          <span
                            className={`hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
                              win.isOpen
                                ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            }`}
                            title="Ventana oficial de 24 horas de Meta Cloud API"
                          >
                            <Clock className="w-2.5 h-2.5" />
                            {win.label}
                          </span>
                        );
                      })()}
                      {isNightShiftActive(opsConfig) && (
                        <span className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-600 shrink-0">
                          <Moon className="w-2.5 h-2.5" />
                          Guardia
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones derechas compactas */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleSummarizeConversation}
                    className="hidden sm:inline-flex p-2 rounded-full bg-zinc-100/80 dark:bg-zinc-800 text-purple-600 dark:text-purple-400 hover:bg-purple-500/15 active:scale-[0.95] transition-all"
                    title="Resumen automático con IA"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTransferTargetUserId(users[0]?.id || '');
                      setTransferModalOpen(true);
                    }}
                    className="hidden md:inline-flex p-2 rounded-full bg-zinc-100/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 active:scale-[0.95] transition-all"
                    title="Transferir chat a otro asesor con nota"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInChatSearchOpen((p) => !p);
                      setInChatSearchQuery('');
                    }}
                    className={`hidden sm:inline-flex p-2 rounded-full transition-all active:scale-[0.95] ${
                      inChatSearchOpen
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-zinc-100/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-700'
                    }`}
                    title="Buscar dentro de esta conversación"
                  >
                    <Search className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePin(activeConversation.id)}
                    className={`hidden md:inline-flex p-2 rounded-full transition-all active:scale-[0.95] ${
                      activeConversation.isPinned
                        ? 'bg-amber-500/15 text-amber-600'
                        : 'bg-zinc-100/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-700'
                    }`}
                    title={activeConversation.isPinned ? 'Desfijar chat' : 'Fijar chat arriba'}
                  >
                    <Pin className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleArchive(activeConversation.id)}
                    className="hidden md:inline-flex p-2 rounded-full bg-zinc-100/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 active:scale-[0.95] transition-all"
                    title={activeConversation.isArchived ? 'Desarchivar chat' : 'Archivar chat'}
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                  <select
                    value={activeConversation.assignedUserId || ''}
                    onChange={(e) =>
                      updateConversations((prev) =>
                        prev.map((c) =>
                          c.id === activeConversation.id
                            ? { ...c, assignedUserId: e.target.value || undefined }
                            : c
                        )
                      )
                    }
                    className="hidden sm:block px-2.5 py-1.5 rounded-full border border-zinc-200/80 dark:border-zinc-700 bg-zinc-100/70 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 focus:outline-none"
                    title="Asignar asesor responsable"
                  >
                    <option value="">Sin asesor</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleToggleControlMode(activeConversation.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold active:scale-[0.96] transition-all whitespace-nowrap shrink-0 ${
                      activeConversation.controlMode === 'bot'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    {activeConversation.controlMode === 'bot' ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden sm:inline">Tomar Control</span>
                        <span className="sm:hidden">Control</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden sm:inline">Reactivar Bot</span>
                        <span className="sm:hidden">Bot</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkUnreadAndClose(activeConversation.id)}
                    className="p-2 rounded-full bg-zinc-100/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 active:scale-[0.95] transition-all"
                    title="Marcar como no leído y cerrar"
                  >
                    <Mail className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setRightDrawerOpen((p) => !p)}
                    className="p-2 rounded-full bg-zinc-100/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 active:scale-[0.95] transition-all"
                    title={rightDrawerOpen ? 'Ocultar panel CRM/Notas' : 'Mostrar panel CRM/Notas'}
                  >
                    {rightDrawerOpen ? (
                      <PanelRightClose className="w-4 h-4" />
                    ) : (
                      <PanelRightOpen className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseChat}
                    className="hidden lg:inline-flex p-2 rounded-full bg-zinc-100/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 active:scale-[0.95] transition-all"
                    title="Cerrar chat (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Banner de Resumen IA si se solicitó */}
              {chatSummaryText && (
                <div className="shrink-0 px-3.5 py-2 border-b border-purple-500/20 bg-purple-500/10 flex items-center justify-between gap-2 text-xs text-purple-900 dark:text-purple-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="truncate">{chatSummaryText}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChatSummaryText(null)}
                    className="p-1 text-purple-500 hover:text-purple-700 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Barra de búsqueda dentro de la conversación */}
              {inChatSearchOpen && (
                <div className="shrink-0 px-3 py-2 border-b border-zinc-200/70 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    value={inChatSearchQuery}
                    onChange={(e) => setInChatSearchQuery(e.target.value)}
                    placeholder="Buscar texto en este chat..."
                    className="flex-1 min-w-0 text-xs bg-transparent text-zinc-900 dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setInChatSearchOpen(false);
                      setInChatSearchQuery('');
                    }}
                    className="p-1 text-zinc-400 hover:text-zinc-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Historial de mensajes (con Drag & Drop, separadores de fecha, formato WhatsApp, audio/video, reacciones) */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (activeConversation.controlMode === 'human') setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  if (activeConversation.controlMode !== 'human') return;
                  const file = e.dataTransfer?.files?.[0];
                  if (file) loadFileIntoPendingMedia(file);
                }}
                className={`relative flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-4 space-y-3 min-w-0 ${
                  isDraggingFile ? 'ring-2 ring-inset ring-emerald-500 bg-emerald-500/5' : ''
                }`}
              >
                {isDraggingFile && (
                  <div className="sticky top-2 z-20 mx-auto w-fit px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-semibold shadow-lg">
                    Suelta aquí tu imagen, audio o documento para adjuntar
                  </div>
                )}

                {activeConversation.messages
                  .filter((m) =>
                    !inChatSearchQuery.trim()
                      ? true
                      : m.text.toLowerCase().includes(inChatSearchQuery.trim().toLowerCase())
                  )
                  .map((msg, msgIdx, arr) => {
                  const isCustomer = msg.sender === 'customer';
                  const prevMsg = msgIdx > 0 ? arr[msgIdx - 1] : null;
                  const showDateSep = !prevMsg || getDateKey(prevMsg.timestamp) !== getDateKey(msg.timestamp);
                  return (
                    <React.Fragment key={msg.id}>
                      {showDateSep && (
                        <div className="flex justify-center my-2">
                          <span className="px-3 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300">
                            {formatDateSeparator(msg.timestamp)}
                          </span>
                        </div>
                      )}
                      <div
                        className={`group flex flex-col w-full min-w-0 ${isCustomer ? 'items-start' : 'items-end'}`}
                      >
                        <div className="flex items-center gap-1.5 max-w-[88%] sm:max-w-[82%] min-w-0">
                          {!isCustomer && !msg.isDeleted && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setReplyingTo({
                                    id: msg.id,
                                    sender: msg.senderName || (msg.sender === 'bot' ? 'Chatbot' : 'Asesor'),
                                    text: msg.text,
                                  })
                                }
                                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                title="Citar mensaje"
                              >
                                <Reply className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setForwardingMsg(msg)}
                                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                title="Reenviar a otro chat"
                              >
                                <Forward className="w-3.5 h-3.5" />
                              </button>
                              {msg.sender === 'agent' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditMessage(msg)}
                                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                    title="Editar mensaje"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="p-1 rounded-md text-zinc-400 hover:text-rose-500"
                                    title="Eliminar mensaje"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          <div
                            className={`min-w-0 max-w-full rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] shadow-sm ${
                              msg.isDeleted
                                ? 'bg-zinc-200/70 dark:bg-zinc-800/70 text-zinc-500 italic'
                                : isCustomer
                                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700'
                                  : msg.sender === 'bot'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-sky-600 text-white'
                            }`}
                          >
                            {msg.isForwarded && !msg.isDeleted && (
                              <div className="text-[10px] italic opacity-75 mb-1 flex items-center gap-1">
                                <Forward className="w-2.5 h-2.5" />
                                Reenviado
                              </div>
                            )}

                            {/* Mensaje citado */}
                            {msg.replyTo && !msg.isDeleted && (
                              <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-black/15 border-l-2 border-white/70 text-[11px] min-w-0 overflow-hidden">
                                <div className="font-bold opacity-90 truncate">{msg.replyTo.sender}</div>
                                <div className="truncate opacity-80">{msg.replyTo.text}</div>
                              </div>
                            )}

                            {/* Media adjunta (Imagen Lightbox, Video, Audio, Documento) */}
                            {msg.mediaUrl && msg.mediaType === 'image' && (
                              <button
                                type="button"
                                onClick={() =>
                                  setLightboxMedia({ url: msg.mediaUrl!, filename: msg.mediaFilename })
                                }
                                className="block mb-2 rounded-xl overflow-hidden hover:opacity-95 transition-opacity"
                                title="Clic para ampliar imagen"
                              >
                                <img
                                  src={msg.mediaUrl}
                                  alt={msg.mediaFilename || 'Imagen adjunta'}
                                  className="max-h-56 max-w-full object-cover rounded-xl"
                                />
                              </button>
                            )}
                            {msg.mediaUrl && msg.mediaType === 'video' && (
                              <video
                                src={msg.mediaUrl}
                                controls
                                className="max-h-56 max-w-full rounded-xl mb-2"
                              />
                            )}
                            {msg.mediaUrl && msg.mediaType === 'audio' && (
                              <audio src={msg.mediaUrl} controls className="w-56 max-w-full mb-2 h-9" />
                            )}
                            {msg.mediaUrl && msg.mediaType === 'document' && (
                              <a
                                href={msg.mediaUrl}
                                download={msg.mediaFilename || 'documento'}
                                className="mb-2 px-2.5 py-1.5 rounded-lg bg-black/15 flex items-center gap-2 text-xs min-w-0 hover:bg-black/25"
                              >
                                <FileText className="w-4 h-4 shrink-0" />
                                <span className="truncate min-w-0">{msg.mediaFilename || 'Documento'}</span>
                              </a>
                            )}

                            <div className="break-words [overflow-wrap:anywhere]">
                              <FormattedWhatsAppText
                                text={msg.text}
                                isLightBubble={isCustomer || Boolean(msg.isDeleted)}
                              />
                            </div>

                            {/* Botones interactivos del chatbot */}
                            {msg.buttons && msg.buttons.length > 0 && !msg.isDeleted && (
                              <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-full">
                                {msg.buttons.map((btn) => (
                                  <button
                                    key={btn.id}
                                    type="button"
                                    onClick={() => handleSendTurn(btn.label, btn.id)}
                                    className="max-w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/95 text-emerald-800 hover:bg-white active:scale-[0.97] transition-all shadow-sm text-left break-words"
                                  >
                                    <div>{btn.label}</div>
                                    {btn.description && (
                                      <div className="text-[10px] font-normal text-zinc-500">
                                        {btn.description}
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Hora + editado + checks de entrega */}
                            <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-75">
                              {msg.isEdited && <span className="italic">editado ·</span>}
                              <span>
                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {!isCustomer && !msg.isDeleted && (
                                <>
                                  {msg.status === 'sent' && <Check className="w-3 h-3" />}
                                  {msg.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
                                  {(msg.status === 'read' || !msg.status) && (
                                    <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {isCustomer && !msg.isDeleted && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setReplyingTo({
                                    id: msg.id,
                                    sender: msg.senderName || activeConversation.customerName,
                                    text: msg.text,
                                  })
                                }
                                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                title="Citar mensaje"
                              >
                                <Reply className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setForwardingMsg(msg)}
                                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                title="Reenviar"
                              >
                                <Forward className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Reacciones existentes + barra rápida al hover */}
                        {!msg.isDeleted && (
                          <div className="flex items-center gap-1 mt-1">
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 shadow-sm text-xs">
                                {msg.reactions.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleToggleReaction(msg.id, emoji)}
                                    className="hover:scale-125 transition-transform"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-700 shadow-sm transition-opacity">
                              {MESSAGE_REACTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleToggleReaction(msg.id, emoji)}
                                  className="text-[11px] hover:scale-125 transition-transform px-0.5"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
                {/* Auditoría reciente del chat */}
                {activeConversation.auditTrail && activeConversation.auditTrail.length > 0 && (
                  <div className="flex flex-col items-center gap-1 py-2">
                    {activeConversation.auditTrail.slice(-3).map((ev) => (
                      <span
                        key={ev.id}
                        className="px-3 py-0.5 rounded-full text-[10px] bg-zinc-200/70 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400"
                      >
                        {ev.actor}: {ev.action} ·{' '}
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Barra inferior fija abajo: BLOQUEADA mientras el Bot está en control */}
              <div className="shrink-0 sticky bottom-0 z-20 relative border-t border-zinc-200/70 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-2.5 sm:p-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] space-y-2">
                {activeConversation.controlMode === 'bot' ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/70">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white leading-tight">
                          Chatbot 24/7 respondiendo automáticamente
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          La caja de texto está bloqueada. Toma el control para escribir al cliente.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleControlMode(activeConversation.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 active:scale-[0.96] transition-all whitespace-nowrap shrink-0 shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Tomar Control
                    </button>
                  </div>
                ) : (
                  <>
                {/* Menú flotante de Respuestas Rápidas */}
                {(quickReplyMenuOpen || chatInput.startsWith('/')) && (
                  <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl p-2.5 z-30 max-h-64 overflow-y-auto space-y-2">
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        Respuestas Rápidas (atajos /)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowAddQrForm((p) => !p)}
                          className="text-[11px] font-semibold text-emerald-600 hover:underline"
                        >
                          {showAddQrForm ? 'Cancelar' : '+ Nuevo atajo'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickReplyMenuOpen(false)}
                          className="p-0.5 text-zinc-400 hover:text-zinc-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {showAddQrForm && (
                      <form onSubmit={handleCreateQuickReply} className="space-y-1.5 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            value={newQrShortcut}
                            onChange={(e) => setNewQrShortcut(e.target.value)}
                            placeholder="/atajo"
                            className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
                          />
                          <input
                            type="text"
                            value={newQrTitle}
                            onChange={(e) => setNewQrTitle(e.target.value)}
                            placeholder="Título corto"
                            className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                          />
                        </div>
                        <textarea
                          rows={2}
                          value={newQrBody}
                          onChange={(e) => setNewQrBody(e.target.value)}
                          placeholder="Mensaje completo..."
                          className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-md text-xs font-semibold text-white"
                          style={{ backgroundColor: customization.primaryColor }}
                        >
                          Guardar Atajo
                        </button>
                      </form>
                    )}

                    <div className="space-y-1">
                      {filteredQuickReplies.map((qr) => (
                        <div
                          key={qr.id}
                          className="flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/70"
                        >
                          <button
                            type="button"
                            onClick={() => handleApplyQuickReply(qr)}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {qr.shortcut}
                              </span>
                              <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                                {qr.title}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">{qr.body}</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuickReply(qr.id)}
                            className="p-1 text-zinc-400 hover:text-rose-500"
                            title="Eliminar atajo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview de mensaje citado (sin desbordamiento horizontal) */}
                {replyingTo && (
                  <div className="w-full max-w-full overflow-hidden px-3 py-2 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/90 border-l-2 border-emerald-500 flex items-center justify-between gap-2 text-xs">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                        Respondiendo a {replyingTo.sender}
                      </div>
                      <div className="text-zinc-600 dark:text-zinc-300 truncate">
                        {replyingTo.text}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="p-1 rounded-full hover:bg-zinc-200/80 dark:hover:bg-zinc-700 shrink-0"
                    >
                      <X className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                  </div>
                )}

                {/* Preview de archivo adjunto */}
                {pendingMedia && (
                  <div className="w-full max-w-full overflow-hidden px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs">
                    <div className="flex-1 min-w-0 truncate font-semibold text-emerald-700 dark:text-emerald-300">
                      Adjunto listo: {pendingMedia.mediaFilename}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingMedia(null)}
                      className="p-1 shrink-0"
                    >
                      <X className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                  </div>
                )}

                {/* Preview de edición de mensaje */}
                {editingMsgId && (
                  <div className="w-full max-w-full overflow-hidden px-3 py-1.5 rounded-xl bg-sky-500/10 border-l-2 border-sky-500 flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-sky-700 dark:text-sky-300 truncate">
                      Editando mensaje enviado...
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMsgId(null);
                        setChatInput('');
                      }}
                      className="p-1 shrink-0"
                    >
                      <X className="w-3.5 h-3.5 text-sky-600" />
                    </button>
                  </div>
                )}

                {/* Picker flotante de Productos del Catálogo ERP */}
                {catalogPickerOpen && (
                  <div className="absolute bottom-full left-3 right-3 mb-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl p-2.5 z-30 max-h-64 overflow-y-auto space-y-1.5">
                    <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <Pizza className="w-3.5 h-3.5 text-orange-500" />
                        Enviar producto del catálogo al chat
                      </span>
                      <button type="button" onClick={() => setCatalogPickerOpen(false)}>
                        <X className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {products
                        .filter((p) => p.isAvailable)
                        .slice(0, 12)
                        .map((prod) => {
                          const price =
                            prod.hasSizes && prod.sizes.length > 0 ? prod.sizes[0].price : prod.basePrice;
                          return (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => handleSendCatalogProduct(prod)}
                              className="flex items-center gap-2 p-1.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all text-left"
                            >
                              {prod.imageUrl ? (
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  className="w-9 h-9 rounded-lg object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-orange-500/15 text-orange-600 flex items-center justify-center shrink-0">
                                  <Pizza className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                                  {prod.name}
                                </div>
                                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                                  S/ {price.toFixed(2)}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Picker flotante de Emojis rápidos */}
                {emojiMenuOpen && (
                  <div className="absolute bottom-full left-3 mb-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-xl p-2 z-30 flex flex-wrap gap-1 max-w-[260px]">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setChatInput((prev) => `${prev}${emoji}`);
                          setEmojiMenuOpen(false);
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-base active:scale-90 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                    {/* Copiloto IA + Acciones rápidas de Venta (cuando hay control humano) */}
                    {copilotOpen && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        <button
                          type="button"
                          onClick={handleOpenOrderFromDetectedText}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 whitespace-nowrap shrink-0"
                          title="Extraer pedido del texto o crear comanda POS"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          Crear Pedido
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void sendDirectAgentMessage(
                              activeConversation,
                              `📲 *Pago Yape / Plin (${activeTenant.name})*\nPuedes realizar tu pago al número oficial de la sede y enviarnos la captura por este chat para confirmar tu pedido.`
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/12 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 whitespace-nowrap shrink-0"
                        >
                          <QrCode className="w-3 h-3" />
                          Enviar Yape/Plin
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void sendDirectAgentMessage(
                              activeConversation,
                              `🍕 *Carta del Día (${customization.appName}):*\nRevisa nuestras pizzas artesanales, combos y promociones en: ${config.storefrontBaseUrl || window.location.origin}`
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-500/12 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20 whitespace-nowrap shrink-0"
                        >
                          <Pizza className="w-3 h-3" />
                          Menú del Día
                        </button>
                        {chatInput.trim().length > 3 && (
                          <button
                            type="button"
                            onClick={() => setChatInput((prev) => polishAgentDraft(prev, 'friendly'))}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-500/12 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 whitespace-nowrap shrink-0"
                          >
                            <Wand2 className="w-3 h-3" />
                            Mejorar tono
                          </button>
                        )}
                        {generateCopilotSuggestions({
                          conv: activeConversation,
                          products,
                          linkedOrders,
                          storeUrl: config.storefrontBaseUrl || window.location.origin,
                        })
                          .slice(0, 2)
                          .map((sug, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setChatInput(sug)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 whitespace-nowrap shrink-0 max-w-[230px] truncate"
                              title={sug}
                            >
                              <Sparkles className="w-3 h-3 text-purple-500 shrink-0" />
                              <span className="truncate">{sug}</span>
                            </button>
                          ))}
                      </div>
                    )}

                    {/* Selector de Plantilla Meta si expiró ventana 24h */}
                    {metaTemplatePickerOpen && (
                      <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-200">
                          <span>Plantillas Aprobadas Meta (Utility / Reactivación)</span>
                          <button type="button" onClick={() => setMetaTemplatePickerOpen(false)}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {config.orderNotifications.slice(0, 4).map((rule) => (
                            <button
                              key={rule.status}
                              type="button"
                              onClick={() => {
                                void sendDirectAgentMessage(
                                  activeConversation,
                                  `[Plantilla Meta: ${rule.templateName}] ${rule.bodyText.replace(/\{\{cliente\}\}/g, activeConversation.customerName).replace(/\{\{sucursal\}\}/g, activeTenant.name)}`
                                );
                                setMetaTemplatePickerOpen(false);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-amber-500/30 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200"
                            >
                              {rule.templateName}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              void sendDirectAgentMessage(
                                activeConversation,
                                `¡Hola ${activeConversation.customerName}! Te extrañamos en *${customization.appName}* 🍕. Hoy tenemos promoción especial para ti en ${config.storefrontBaseUrl || window.location.origin}.`
                              );
                              setMetaTemplatePickerOpen(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold"
                          >
                            Plantilla Reactivación 30d
                          </button>
                        </div>
                      </div>
                    )}

                    <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSendTurn();
                  }}
                  className="flex items-center gap-1.5 sm:gap-2 w-full min-w-0"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    onChange={handleAttachFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.95] transition-all shrink-0"
                    title="Adjuntar imagen, video, audio o documento"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickReplyMenuOpen((p) => !p);
                      setCatalogPickerOpen(false);
                      setEmojiMenuOpen(false);
                    }}
                    className={`p-2 rounded-full border transition-all active:scale-[0.95] shrink-0 ${
                      quickReplyMenuOpen
                        ? 'border-amber-500/60 bg-amber-500/10 text-amber-600'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    title="Respuestas rápidas (/)"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogPickerOpen((p) => !p);
                      setQuickReplyMenuOpen(false);
                      setEmojiMenuOpen(false);
                    }}
                    className={`hidden sm:inline-flex p-2 rounded-full border transition-all active:scale-[0.95] shrink-0 ${
                      catalogPickerOpen
                        ? 'border-orange-500/60 bg-orange-500/10 text-orange-600'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    title="Enviar producto del catálogo"
                  >
                    <Pizza className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmojiMenuOpen((p) => !p);
                      setQuickReplyMenuOpen(false);
                      setCatalogPickerOpen(false);
                    }}
                    className="hidden sm:inline-flex p-2 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.95] transition-all shrink-0"
                    title="Insertar emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    enterKeyHint="send"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onPaste={handlePasteMedia}
                    placeholder={
                      isRecordingVoice
                        ? `Grabando nota de voz (${recordingSeconds}s)...`
                        : 'Escribe un mensaje o /atajo...'
                    }
                    className="flex-1 min-w-0 px-3.5 sm:px-4 py-2 rounded-full border border-zinc-200/90 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800 text-base sm:text-sm focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 transition-colors"
                  />

                  <button
                    type="button"
                    onClick={() => void handleToggleVoiceRecording()}
                    className={`w-10 h-10 sm:w-auto sm:h-auto sm:p-2 rounded-full border transition-all active:scale-[0.95] shrink-0 flex items-center justify-center ${
                      isRecordingVoice
                        ? 'border-rose-500 bg-rose-500 text-white animate-pulse'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    title={isRecordingVoice ? 'Detener grabación' : 'Grabar nota de voz'}
                  >
                    {isRecordingVoice ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full text-sm font-semibold text-white active:scale-[0.96] transition-transform whitespace-nowrap shrink-0 shadow-sm"
                    style={{ backgroundColor: editingMsgId ? '#0284c7' : '#25D366' }}
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">{editingMsgId ? 'Guardar' : 'Enviar'}</span>
                  </button>
                </form>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-center mb-4">
                <Inbox className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
              </div>
              <h2 className="text-base font-semibold tracking-[-0.015em] text-zinc-900 dark:text-white">
                Ninguna conversación abierta
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mt-1.5 leading-relaxed">
                Selecciona un chat de la izquierda solo cuando quieras leerlo o responder. Mientras tanto, tu chatbot 24/7 sigue atendiendo automáticamente.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {branchConversations.filter((c) => c.controlMode === 'bot').length} en Bot 24/7
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {branchConversations.filter((c) => c.controlMode === 'human').length} con Asesor
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 mt-6">
                Atajo rápido: pulsa{' '}
                <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 font-mono text-[10px] text-zinc-700 dark:text-zinc-300">
                  Esc
                </kbd>{' '}
                en cualquier momento para cerrar un chat abierto.
              </p>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: PEDIDO ERP, ETIQUETAS CRM Y NOTAS INTERNAS (Drawer flotante en móvil) */}
        {rightDrawerOpen && activeConversation && (
          <>
            <div
              onClick={() => setRightDrawerOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/40 z-30"
            />
            <div className="fixed lg:static inset-y-0 right-0 w-[88vw] max-w-[360px] lg:w-auto lg:max-w-none lg:col-span-3 z-40 shadow-2xl lg:shadow-none border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col min-h-0 h-full">
              <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1">
                <div className="flex-1 grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'order', label: 'Pedidos', icon: ShoppingBag },
                      { id: 'tags', label: 'Etiquetas', icon: Tag },
                      { id: 'notes', label: 'Notas', icon: StickyNote },
                    ] as const
                  ).map((tab) => {
                    const Icon = tab.icon;
                    const active = rightDrawerTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setRightDrawerTab(tab.id)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                          active
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setRightDrawerOpen(false)}
                  className="lg:hidden p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="Cerrar panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {/* TAB CLIENTE CRM Y PEDIDOS DEL ERP */}
              {rightDrawerTab === 'order' && (
                <>
                  {/* Ficha de Contacto / Registro CRM */}
                  <div className="p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">
                        {linkedCustomer ? 'Cliente Registrado (CRM)' : 'Contacto sin Registrar'}
                      </span>
                      <button
                        type="button"
                        onClick={() => (crmFormOpen ? setCrmFormOpen(false) : openCrmRegistrationForm())}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white active:scale-[0.96] transition-transform whitespace-nowrap shrink-0"
                        style={{ backgroundColor: customization.primaryColor }}
                      >
                        {linkedCustomer ? (
                          <>
                            <Edit3 className="w-3 h-3" />
                            {crmFormOpen ? 'Cerrar' : 'Editar'}
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3" />
                            {crmFormOpen ? 'Cerrar' : 'Registrar'}
                          </>
                        )}
                      </button>
                    </div>

                    {crmSavedBanner && (
                      <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                        {crmSavedBanner}
                      </div>
                    )}

                    {crmFormOpen ? (
                      <form onSubmit={handleSaveCrmCustomer} className="space-y-2 pt-1">
                        <input
                          type="text"
                          required
                          value={crmFullName}
                          onChange={(e) => setCrmFullName(e.target.value)}
                          placeholder="Nombre completo *"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                        />
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={crmDni}
                            onChange={(e) => setCrmDni(e.target.value)}
                            placeholder="DNI (8d) / RUC (11d)"
                            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => void handleQuickDniRucLookup()}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-[11px] font-semibold whitespace-nowrap shrink-0"
                          >
                            Buscar
                          </button>
                        </div>
                        {dniLookupStatus && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            {dniLookupStatus}
                          </div>
                        )}
                        <input
                          type="text"
                          value={crmPhone}
                          onChange={(e) => setCrmPhone(e.target.value)}
                          placeholder="WhatsApp"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
                        />
                        <input
                          type="email"
                          value={crmEmail}
                          onChange={(e) => setCrmEmail(e.target.value)}
                          placeholder="Correo electrónico"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                        />
                        <input
                          type="text"
                          value={crmAddress}
                          onChange={(e) => setCrmAddress(e.target.value)}
                          placeholder="Dirección de entrega"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                        />
                        <input
                          type="text"
                          value={crmReference}
                          onChange={(e) => setCrmReference(e.target.value)}
                          placeholder="Referencia (ej. frente al parque)"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                        />
                        <button
                          type="submit"
                          className="w-full py-1.5 rounded-xl text-xs font-semibold text-white active:scale-[0.98] transition-transform"
                          style={{ backgroundColor: '#25D366' }}
                        >
                          Guardar Cliente en CRM
                        </button>
                      </form>
                    ) : linkedCustomer ? (
                      <div className="space-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-zinc-900 dark:text-white truncate">
                            {linkedCustomer.fullName}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold shrink-0">
                            <Award className="w-3 h-3" />
                            {linkedCustomer.loyaltyPoints || 0} pts
                          </span>
                        </div>
                        {linkedCustomer.dni && <div>DNI/RUC: {linkedCustomer.dni}</div>}
                        {linkedCustomer.whatsapp && (
                          <div className="font-mono">WhatsApp: {linkedCustomer.whatsapp}</div>
                        )}
                        {linkedCustomer.address && (
                          <div className="break-words">Dirección: {linkedCustomer.address}</div>
                        )}
                        {linkedCustomer.reference && (
                          <div className="text-zinc-500 break-words">Ref: {linkedCustomer.reference}</div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        WhatsApp API solo envía nombre de perfil y número. Registra sus datos aquí para vincularlo a Pedidos y Delivery.
                      </p>
                    )}

                    {/* Acciones rápidas CRM: Exportar PDF, Plantillas Meta, Bloquear Spam */}
                    <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-700/60 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => exportConversationToPdf(activeConversation, customization.appName)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                        title="Exportar historial a PDF"
                      >
                        <FileDown className="w-3 h-3" />
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetaTemplatePickerOpen((p) => !p)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                        title="Enviar Plantilla Meta / Reactivación"
                      >
                        <Zap className="w-3 h-3 text-amber-500" />
                        Plantilla Meta
                      </button>
                      <button
                        type="button"
                        onClick={handleBlockCurrentContact}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 text-[10px] font-semibold text-rose-600 hover:bg-rose-500/20"
                        title="Bloquear número spam"
                      >
                        <ShieldBan className="w-3 h-3" />
                        Bloquear
                      </button>
                    </div>
                  </div>

                  {/* KPIs del cliente + Pizza favorita */}
                  {linkedCustomerKpis && (
                    <div className="p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60">
                          <div className="text-[10px] text-zinc-500">Gastado</div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-white">
                            S/ {linkedCustomerKpis.totalSpent.toFixed(0)}
                          </div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60">
                          <div className="text-[10px] text-zinc-500">Ticket</div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-white">
                            S/ {linkedCustomerKpis.avgTicket.toFixed(0)}
                          </div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60">
                          <div className="text-[10px] text-zinc-500">Pedidos</div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-white">
                            {linkedCustomerKpis.orderCount}
                          </div>
                        </div>
                      </div>
                      {linkedCustomerKpis.favoritePizza && (
                        <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-orange-500/10 text-[11px]">
                          <span className="text-orange-700 dark:text-orange-300 truncate">
                            🍕 Favorita: <strong>{linkedCustomerKpis.favoritePizza}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void sendDirectAgentMessage(
                                activeConversation,
                                `¡Hola ${activeConversation.customerName}! ¿Te provocamos con tu favorita *${linkedCustomerKpis.favoritePizza}* hoy? 🍕`
                              )
                            }
                            className="text-[10px] font-bold text-orange-600 hover:underline shrink-0"
                          >
                            Ofrecer
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botón Crear Pedido POS desde el Chat */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="text-xs font-bold text-zinc-900 dark:text-white">
                      Pedidos Vinculados ({linkedOrders.length})
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOrderBuilderPreselect([]);
                        setOrderBuilderAddress(linkedCustomer?.address || '');
                        setOrderBuilderOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white whitespace-nowrap shrink-0"
                      style={{ backgroundColor: '#25D366' }}
                    >
                      <Plus className="w-3 h-3" />
                      Crear Pedido
                    </button>
                  </div>

                  {linkedOrders.length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      Este contacto aún no tiene pedidos registrados con este teléfono.
                    </p>
                  ) : (
                    linkedOrders.map((ord) => {
                      const steps = ['recibido', 'en_cocina', 'en_horno', 'listo', 'en_ruta', 'entregado'] as const;
                      const currentStepIdx = steps.indexOf(ord.status as (typeof steps)[number]);
                      return (
                        <div
                          key={ord.id}
                          className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white">
                              {ord.orderNumber}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 uppercase">
                              {ord.status.replace(/_/g, ' ')}
                            </span>
                          </div>

                          {/* Timeline visual KDS/Delivery */}
                          <div className="grid grid-cols-6 gap-1">
                            {steps.map((st, sIdx) => (
                              <div
                                key={st}
                                title={st.replace(/_/g, ' ')}
                                className={`h-1.5 rounded-full ${
                                  currentStepIdx >= sIdx
                                    ? 'bg-emerald-500'
                                    : 'bg-zinc-200 dark:bg-zinc-700'
                                }`}
                              />
                            ))}
                          </div>

                          <div className="text-[11px] text-zinc-500">
                            {ord.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                          </div>
                          <div className="flex items-center justify-between text-xs font-bold text-zinc-900 dark:text-white">
                            <span>Total: S/ {ord.total.toFixed(2)}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                ord.paymentStatus === 'pagado'
                                  ? 'bg-emerald-500/15 text-emerald-600'
                                  : 'bg-amber-500/15 text-amber-600'
                              }`}
                            >
                              {ord.paymentStatus === 'pagado' ? 'Pagado' : 'Pendiente'}
                            </span>
                          </div>

                          {/* Acciones operativas KDS / Delivery / Pago */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {ord.paymentStatus !== 'pagado' && (
                              <button
                                type="button"
                                onClick={() => markOrderPaid(ord.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-semibold"
                              >
                                <DollarSign className="w-3 h-3" />
                                Marcar Pagado
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                void sendDirectAgentMessage(
                                  activeConversation,
                                  `Hola ${activeConversation.customerName}, te informamos que tu pedido *${ord.orderNumber}* tiene una ligera demora de ~10 minutos en horno. ¡Gracias por tu paciencia!`
                                )
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-semibold"
                            >
                              <Flame className="w-3 h-3" />
                              Avisar +10m
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void sendDirectAgentMessage(
                                  activeConversation,
                                  `¿Deseas repetir tu pedido *${ord.orderNumber}* (${ord.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}) por *S/ ${ord.total.toFixed(2)}*? Confírmanos para enviarlo a cocina.`
                                )
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-200/80 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-semibold"
                            >
                              <Repeat className="w-3 h-3" />
                              Repetir
                            </button>
                            {ord.status === 'entregado' && (
                              <button
                                type="button"
                                onClick={() =>
                                  void sendDirectAgentMessage(
                                    activeConversation,
                                    `¡Gracias por tu compra! Del 1 al 5, ¿qué tal estuvo tu pedido *${ord.orderNumber}*? ⭐`
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px] font-semibold"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Encuesta
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Recordatorios de seguimiento futuro */}
                  <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-800 space-y-2">
                    <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-amber-500" />
                      Recordatorios de Seguimiento
                    </div>
                    <form onSubmit={handleAddReminder} className="space-y-1.5">
                      <input
                        type="text"
                        value={reminderText}
                        onChange={(e) => setReminderText(e.target.value)}
                        placeholder="Ej. Llamar para evento viernes..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="datetime-local"
                          value={reminderDue}
                          onChange={(e) => setReminderDue(e.target.value)}
                          className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px]"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-[11px] font-semibold whitespace-nowrap shrink-0"
                        >
                          Agendar
                        </button>
                      </div>
                    </form>
                    {(activeConversation.reminders || []).map((rem) => (
                      <div
                        key={rem.id}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-[11px] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-900 dark:text-white truncate">{rem.text}</div>
                          <div className="text-[10px] text-zinc-500">{rem.dueAt.replace('T', ' ')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* TAB ETIQUETAS CRM */}
              {rightDrawerTab === 'tags' && (
                <>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">
                    Etiquetas del Chat
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => {
                      const active = activeConversation.tags.includes(tag.name);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleTagOnConv(tag.name)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                            active
                              ? 'border-transparent text-white shadow-sm'
                              : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                          style={active ? { backgroundColor: tag.color } : undefined}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: active ? '#ffffff' : tag.color }}
                          />
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>

                  <form onSubmit={handleCreateTag} className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                    <label className="block text-[11px] font-semibold text-zinc-500">
                      Nueva etiqueta CRM
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="Ej. Mayorista"
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white"
                        style={{ backgroundColor: customization.primaryColor }}
                      >
                        +
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* TAB NOTAS INTERNAS */}
              {rightDrawerTab === 'notes' && (
                <>
                  <form onSubmit={handleAddNote} className="space-y-2">
                    <textarea
                      rows={3}
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Nota interna solo visible para tu equipo..."
                      className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {NOTE_COLORS.map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => setNewNoteColor(col)}
                            className={`w-4 h-4 rounded-full border ${
                              newNoteColor === col ? 'ring-2 ring-zinc-900 dark:ring-white' : 'border-zinc-300'
                            }`}
                            style={{ backgroundColor: col }}
                          />
                        ))}
                      </div>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
                        style={{ backgroundColor: customization.primaryColor }}
                      >
                        Guardar Nota
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2 pt-2">
                    {activeConversationNotes.length === 0 ? (
                      <p className="text-xs text-zinc-500">Sin notas internas en este chat.</p>
                    ) : (
                      activeConversationNotes.map((note) => (
                        <div
                          key={note.id}
                          style={{ backgroundColor: note.color }}
                          className="p-2.5 rounded-xl text-zinc-900 space-y-1 shadow-sm"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold opacity-75">
                            <span>{note.authorName}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(note.id)}
                              className="hover:text-rose-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs whitespace-pre-wrap">{note.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          </>
        )}
      </div>

      {/* LIGHTBOX VISOR DE IMÁGENES (Estilo Apple) */}
      {lightboxMedia && (
        <div
          onClick={() => setLightboxMedia(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center gap-3"
          >
            <div className="w-full flex items-center justify-between gap-3 text-white">
              <span className="text-xs font-semibold truncate">{lightboxMedia.filename || 'Imagen'}</span>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={lightboxMedia.url}
                  download={lightboxMedia.filename || 'imagen.png'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxMedia(null)}
                  className="p-2 rounded-full bg-white/15 hover:bg-white/25"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <img
              src={lightboxMedia.url}
              alt={lightboxMedia.filename || 'Vista ampliada'}
              className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain"
            />
          </div>
        </div>
      )}

      {/* MODAL REENVIAR MENSAJE A OTRO CHAT */}
      {forwardingMsg && (
        <div
          onClick={() => setForwardingMsg(null)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <Forward className="w-4 h-4 text-emerald-600" />
                Reenviar mensaje a...
              </h3>
              <button type="button" onClick={() => setForwardingMsg(null)}>
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">
              {forwardingMsg.text}
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
              {branchConversations
                .filter((c) => c.id !== activeConversation?.id)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleForwardToConversation(c.id)}
                    className="w-full py-2.5 px-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/70 rounded-lg flex items-center justify-between gap-2"
                  >
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                      {c.customerName}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 whitespace-nowrap shrink-0">
                      Reenviar →
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL TRANSFERIR CHAT A OTRO ASESOR CON NOTA */}
      {transferModalOpen && activeConversation && (
        <div
          onClick={() => setTransferModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleTransferChat}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                Transferir conversación
              </h3>
              <button type="button" onClick={() => setTransferModalOpen(false)}>
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">
                Asesor destino
              </label>
              <select
                value={transferTargetUserId}
                onChange={(e) => setTransferTargetUserId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.roleName})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">
                Nota obligatoria de contexto
              </label>
              <textarea
                rows={3}
                required
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder="Ej. Cliente pide cambio de dirección en su pedido..."
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0"
                style={{ backgroundColor: customization.primaryColor }}
              >
                Transferir Ahora
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DE MÉTRICAS SLA, BI Y OPERACIÓN */}
      <InboxMetricsModal
        isOpen={metricsModalOpen}
        onClose={() => setMetricsModalOpen(false)}
        conversations={branchConversations}
        logs={logs}
        orders={orders}
        users={users}
        opsConfig={opsConfig}
        onUpdateOpsConfig={updateOpsConfig}
        onUnblockPhone={(phone) => {
          updateOpsConfig({
            blockedPhones: opsConfig.blockedPhones.filter((p) => p !== phone),
          });
        }}
        primaryColor={customization.primaryColor}
      />

      {/* MODAL CREAR PEDIDO POS DESDE EL CHAT */}
      {activeConversation && (
        <InboxOrderBuilderModal
          isOpen={orderBuilderOpen}
          onClose={() => setOrderBuilderOpen(false)}
          customerName={linkedCustomer?.fullName || activeConversation.customerName}
          customerPhone={activeConversation.customerPhone}
          initialAddress={orderBuilderAddress || linkedCustomer?.address || ''}
          savedAddresses={activeConversation.savedAddresses}
          preselectedItems={orderBuilderPreselect}
          products={products}
          tenantId={activeConversation.branchId || activeTenant.id}
          storefrontUrl={config.storefrontBaseUrl || window.location.origin}
          primaryColor={customization.primaryColor}
          onCreateOrder={createOrder}
          onOrderCreatedInChat={(ord, sendLink) => {
            updateConversations((prev) =>
              prev.map((c) =>
                c.id === activeConversation.id
                  ? {
                      ...c,
                      linkedOrderNumber: ord.orderNumber,
                      tags: Array.from(new Set([...c.tags, 'Pedido Activo'])),
                    }
                  : c
              )
            );
            appendAuditEvent(activeConversation.id, `Creó pedido ${ord.orderNumber}`);
            const storeUrl = (config.storefrontBaseUrl || window.location.origin).replace(/\/+$/, '');
            const payLink = `${storeUrl}/pagar/${encodeURIComponent(ord.id)}`;
            const summary = ord.items
              .map((i) => {
                const sz = i.size?.name ? ` (${i.size.name})` : '';
                const subs =
                  i.subOptions && i.subOptions.length > 0
                    ? ` [${i.subOptions.map((s) => s.choiceName).join(', ')}]`
                    : '';
                return `• ${i.quantity}x ${i.productName}${sz}${subs}`;
              })
              .join('\n');
            void sendDirectAgentMessage(
              activeConversation,
              `✅ *Pedido registrado ${ord.orderNumber}*\n${summary}\n*Total:* S/ ${ord.total.toFixed(2)}\n*Entrega:* ${ord.deliveryAddress}${
                sendLink
                  ? `\n\n💳 *Paga en línea (Tarjeta o Yape) aquí:*\n${payLink}\n_(Apenas se confirme tu pago, el pedido pasa automáticamente a Cocina 🍕🔥)_`
                  : ''
              }`
            );
          }}
        />
      )}

      {/* NAVBAR INFERIOR DE CANALES EN MÓVIL (SOLO EN LISTA DE BANDEJA) */}
      {mobilePane === 'list' && (
        <nav
          aria-label="Canales de Bandeja"
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 erp-mobile-safe-bottom bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800/80 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.4)]"
        >
          <div className="grid grid-cols-4 gap-1 px-2 pt-1.5">
            {(
              [
                { id: 'all', label: 'Todos', count: channelCounts.all, color: customization.primaryColor },
                { id: 'whatsapp', label: 'WhatsApp', count: channelCounts.whatsapp, color: '#25D366' },
                { id: 'facebook', label: 'Messenger', count: channelCounts.facebook, color: '#0084FF' },
                { id: 'instagram', label: 'Instagram', count: channelCounts.instagram, color: '#E1306C' },
              ] as const
            ).map((ch) => {
              const active = channelFilter === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannelFilter(ch.id)}
                  className={`relative min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] transition-all duration-100 ease-out active:scale-95 ${
                    active
                      ? 'font-bold text-zinc-950 dark:text-white'
                      : 'font-medium text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  <span
                    className={`relative flex items-center justify-center px-3.5 h-6 rounded-full transition-colors ${
                      active ? 'bg-zinc-900/8 dark:bg-white/12' : ''
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: ch.color, opacity: active ? 1 : 0.55 }}
                    />
                    {ch.count > 0 && (
                      <span
                        className="ml-1.5 text-[10px] font-bold tabular-nums"
                        style={active ? { color: ch.color } : undefined}
                      >
                        {ch.count > 99 ? '99+' : ch.count}
                      </span>
                    )}
                  </span>
                  <span className="truncate max-w-[74px]">{ch.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* MODAL / BOTTOM SHEET NUEVO MENSAJE (NOMBRE Y NÚMERO) */}
      <dialog
        ref={newMessageDialogRef}
        onCancel={(e) => {
          e.preventDefault();
          setNewMessageOpen(false);
        }}
        onClick={(e) => {
          if (e.target === newMessageDialogRef.current) setNewMessageOpen(false);
        }}
        className="p-0 max-w-lg w-full"
      >
        <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-t-3xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden">
          <form onSubmit={handleCreateNewMessage} className="p-4 sm:p-5 space-y-4 safe-bottom-bar">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white leading-tight">
                Nuevo mensaje
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Inicia una conversación ingresando nombre y número.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNewMessageOpen(false)}
              className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center active:scale-95 transition-transform shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Selector de Canal */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80">
            {(['whatsapp', 'facebook', 'instagram'] as const).map((ch) => {
              const active = newMsgChannel === ch;
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setNewMsgChannel(ch)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all duration-100 ease-out active:scale-[0.97] flex items-center justify-center gap-1.5 ${
                    active
                      ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: CHANNEL_META[ch].color }}
                  />
                  <span>{CHANNEL_META[ch].label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Nombre del cliente
              </label>
              <input
                type="text"
                required
                autoFocus
                value={newMsgName}
                onChange={(e) => setNewMsgName(e.target.value)}
                placeholder="Ej. María López"
                className="w-full saas-input px-3.5 py-2.5 text-base sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {newMsgChannel === 'whatsapp' ? 'Número de WhatsApp' : 'Usuario o ID'}
              </label>
              <input
                type={newMsgChannel === 'whatsapp' ? 'tel' : 'text'}
                inputMode={newMsgChannel === 'whatsapp' ? 'tel' : 'text'}
                required
                value={newMsgPhone}
                onChange={(e) => setNewMsgPhone(e.target.value)}
                placeholder={newMsgChannel === 'whatsapp' ? 'Ej. 51987654321' : 'Ej. @maria.lopez'}
                className="w-full saas-input px-3.5 py-2.5 text-base sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Mensaje inicial <span className="text-zinc-400 font-normal">(opcional)</span>
              </label>
              <textarea
                rows={2}
                value={newMsgText}
                onChange={(e) => setNewMsgText(e.target.value)}
                placeholder="Hola, te escribimos de..."
                className="w-full saas-input px-3.5 py-2.5 text-base sm:text-sm resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setNewMessageOpen(false)}
              className="saas-btn-secondary px-4 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="saas-btn-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              style={{ backgroundColor: customization.primaryColor }}
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span>Abrir chat</span>
            </button>
          </div>
        </form>
        </div>
      </dialog>
    </div>
  );
};
