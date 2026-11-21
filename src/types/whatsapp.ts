import { OrderStatus } from './catalog';

export type WhatsAppNumberMode = 'centralized' | 'per_branch';
export type WhatsAppSalesMode = 'in_chat_order' | 'storefront_link';

export type WhatsAppInteractionType = 'text' | 'buttons' | 'list';

export type OmnichannelType = 'whatsapp' | 'facebook' | 'instagram';

export type WhatsAppFlowNodeType =
  | 'welcome'
  | 'branch_select'
  | 'menu'
  | 'order_catalog'
  | 'order_status'
  | 'store_link'
  | 'faq'
  | 'handoff'
  | 'custom';

export interface WhatsAppMetaCredentials {
  enabled: boolean;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  verifyToken: string;
  appSecret: string;
  displayPhoneNumber: string;
  apiVersion: string;
  webhookUrl: string;
}

export interface MetaSocialChannelsConfig {
  facebookEnabled: boolean;
  facebookPageId: string;
  facebookPageName: string;
  facebookAccessToken: string;
  instagramEnabled: boolean;
  instagramAccountId: string;
  instagramUsername: string;
  instagramAccessToken: string;
}

export interface WhatsAppOrderNotificationRule {
  status: OrderStatus;
  label: string;
  enabled: boolean;
  useMetaTemplate: boolean;
  templateName: string;
  templateLanguage: string;
  bodyText: string;
}

export interface WhatsAppFlowOption {
  id: string;
  label: string;
  description?: string;
  nextNodeId: string;
}

export interface WhatsAppFlowNode {
  id: string;
  title: string;
  type: WhatsAppFlowNodeType;
  enabled: boolean;
  triggerKeywords: string[];
  messageBody: string;
  interactionType: WhatsAppInteractionType;
  options: WhatsAppFlowOption[];
  position?: { x: number; y: number };
}

export interface WhatsAppModuleConfig {
  numberMode: WhatsAppNumberMode;
  salesMode: WhatsAppSalesMode;
  autoReplyEnabled: boolean;
  humanHandoffMinutes: number;
  storefrontBaseUrl: string;
  realtimeServerUrl: string;
  centralizedCredentials: WhatsAppMetaCredentials;
  branchCredentials: Record<string, WhatsAppMetaCredentials>;
  metaSocialChannels: MetaSocialChannelsConfig;
  orderNotifications: WhatsAppOrderNotificationRule[];
  flowNodes: WhatsAppFlowNode[];
  updatedAt: string;
}

export interface WhatsAppInteractiveButton {
  id: string;
  label: string;
  description?: string;
}

export interface WhatsAppMessageReplyRef {
  id: string;
  sender: string;
  text: string;
}

export interface WhatsAppChatMessage {
  id: string;
  sender: 'customer' | 'bot' | 'agent';
  senderName?: string;
  text: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  interactiveType?: WhatsAppInteractionType;
  buttons?: WhatsAppInteractiveButton[];
  templateName?: string;
  replyTo?: WhatsAppMessageReplyRef;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  mediaFilename?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  isForwarded?: boolean;
  reactions?: string[];
}

export interface WhatsAppBotCartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface WhatsAppConversationReminder {
  id: string;
  text: string;
  dueAt: string;
  done?: boolean;
}

export interface WhatsAppAuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
}

export interface WhatsAppConversation {
  id: string;
  channel: OmnichannelType;
  customerPhone: string;
  customerName: string;
  branchId: string;
  controlMode: 'bot' | 'human';
  pausedUntil?: string;
  currentNodeId: string;
  pendingStep?: 'awaiting_address' | 'awaiting_payment_method' | 'awaiting_order_lookup' | null;
  cart: WhatsAppBotCartItem[];
  linkedOrderNumber?: string;
  tags: string[];
  assignedUserId?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  isResolved?: boolean;
  isBlocked?: boolean;
  snoozedUntil?: string;
  sentiment?: 'positive' | 'neutral' | 'angry';
  detectedIntent?: string;
  activeViewerName?: string;
  firstResponseMs?: number;
  resolvedAt?: string;
  lastCustomerMessageAt?: string;
  savedAddresses?: Array<{ label: string; address: string; reference?: string }>;
  linkedHandles?: { whatsapp?: string; facebook?: string; instagram?: string };
  reminders?: WhatsAppConversationReminder[];
  auditTrail?: WhatsAppAuditEvent[];
  storyReplyPreview?: { imageUrl: string; caption: string };
  publicCommentContext?: { postTitle: string; commentText: string };
  unreadCount: number;
  lastMessageAt: string;
  messages: WhatsAppChatMessage[];
}

export interface InboxOperationsConfig {
  agentStatus: 'available' | 'paused' | 'readonly';
  roundRobinEnabled: boolean;
  signMessagesWithAgentName: boolean;
  chatBackground: 'minimal' | 'whatsapp_pattern';
  nightModeEnabled: boolean;
  nightShiftStart: string;
  nightShiftEnd: string;
  slaAlertThresholdMinutes: number;
  slaAlertMaxWaiting: number;
  autoReactivateBotMinutes: number;
  blockedPhones: string[];
}

export interface InboxTagItem {
  id: string;
  name: string;
  color: string;
}

export interface InboxQuickReply {
  id: string;
  shortcut: string;
  title: string;
  body: string;
  mediaUrl?: string;
}

export interface InboxNoteItem {
  id: string;
  conversationId: string;
  authorName: string;
  content: string;
  color: string;
  createdAt: string;
}

export interface WhatsAppDeliveryLog {
  id: string;
  timestamp: string;
  direction: 'outbound' | 'inbound';
  channelType: 'order_status' | 'chatbot_flow' | 'agent_reply' | 'webhook';
  branchId: string;
  toPhone: string;
  summary: string;
  templateName?: string;
  orderNumber?: string;
  status: 'sent' | 'simulated' | 'failed';
  errorMessage?: string;
}
