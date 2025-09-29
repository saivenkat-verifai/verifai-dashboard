// src/app/interfaces.ts
export interface Message {
  siteName: string;
  siteId: string;
  cameraId: string;
  objectName: string;
  eventTag: string;
  eventTime: string;
  httpUrl: string;
  imageUrl: string;
  noOfImages: number;
  actionTag?: string;
  actionTime?: string;
  userLevels?: string;
  landingTime?: string;
  queueName?: string;
  queueLevel?: string;
}

export interface Queue {
  queueName: string;
  queueLevel: string;
  count: number;
  messages: Message[];
}

export interface QueueCategory {
  queues: Queue[];
}

export interface PendingEventsResponse {
  totalEvents: number;
  siteCount: number;
  cameraCount: number;
  eventWallCount: number;
  manualWallCount: number;
  missedWallCount: number;
  eventWallQueues: QueueCategory;
  manualWallQueues: QueueCategory;
  missedWallQueues: QueueCategory;
}



export interface CombinedQueue {
  queueName: string;
  queueLevel: string;
  count: number;
  messages: Message[];
}

export interface IconData {
  iconPath: string;
  count: number;
}

export interface CardDot {
  iconcolor: string;
  count: number;
}

export interface EscalatedDetail {
  label: string;
  value: number;
  color: string;
  icons?: IconData[];
  colordot?: CardDot[];
}

export interface SecondEscalatedDetail {
  label?: string;
  value?: number;
  iconPath?: string;
  color?: string;
  iconcolor?: string;
}