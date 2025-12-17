export interface MessageType {
  uid: string;
  message: string;
  timestamp: number;
  replyingTo?: {
    messageId: number;
    message: string;
    uid: string;
  };
}
