export interface UserContext {
  requestId: string;
  startTime: number;
  url: string;
  method: string;
  history: RequestInfo[];
  userId?: string;
  userName?: string;
  realName?: string;
  eMail?: string;
  phone?: string;
  moduleId?: string;

  [key: string]: any;
}

interface RequestInfo {
  requestId: string;
  startTime: number;
  url: string;
  method: string;
}
export interface ContextModuleOptions {
  enableCaching?: boolean;
}

export const CONTEXT_HEADER = 'X-User-Context';
