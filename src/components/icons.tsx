import { Loader2, Lock, Mail, Eye, EyeOff, Check, X, AlertCircle, ArrowLeft } from 'lucide-react';

export const Icons = {
  spinner: Loader2,
  lock: Lock,
  mail: Mail,
  eye: Eye,
  eyeOff: EyeOff,
  check: Check,
  x: X,
  alert: AlertCircle,
  arrowLeft: ArrowLeft,
};

export type Icon = keyof typeof Icons;
