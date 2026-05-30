import { CheckCircle2, ArrowRightLeft, Clock } from 'lucide-react';
import { STATUS } from '../constants';

export const getStatusIcon = (s) =>
  s === STATUS.CONFIRMED ? <CheckCircle2 size={14} /> :
  s === STATUS.MOVED ? <ArrowRightLeft size={14} /> :
  <Clock size={14} />;

export const getStatusLabel = (s) =>
  s === STATUS.CONFIRMED ? 'Confirmado' :
  s === STATUS.MOVED ? 'Movido' :
  'Pendente';

export const getStatusClass = (s) =>
  s === STATUS.CONFIRMED ? 'status-confirmed' :
  s === STATUS.MOVED ? 'status-moved' :
  'status-pending';
