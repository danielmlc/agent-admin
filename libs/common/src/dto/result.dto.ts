import { EHttpStatus } from '../constants';
export class Result<T> {
  code: number;
  status: EHttpStatus;
  message: any;
  error?: any;
  result?: T;
}

export class ErrorResult {
  code: number;
  message: string;
  data?: string;
  stack?: string;
  path?: string;
  timestamp?: string;
}
