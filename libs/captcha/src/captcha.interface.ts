export interface CaptchaResult {
  id: string;
  data: string;
  text: string;
}

export interface CaptchaOptions {
  size?: number;
  noise?: number;
  color?: boolean;
  background?: string;
  width?: number;
  height?: number;
  fontSize?: number;
  charPreset?: string;
}
