
export type UserRole = 'ADMIN' | 'CONTROL_MANAGER' | 'PROCTOR' | 'CONTROL' | 'ASSISTANT_CONTROL' | 'COUNSELOR';

export interface User {
  id: string;
  national_id: string;
  full_name: string;
  role: UserRole;
  phone: string;
  assigned_committees?: string[]; 
  assigned_grades?: string[];      
}

export interface Student {
  id: string;
  national_id: string;
  name: string;
  grade: string;
  section: string;
  parent_phone: string;
  committee_number: string;
  seating_number?: string;
  location?: string;
}

export interface Supervision {
  id: string;
  teacher_id: string;
  committee_number: string;
  date: string;
  period: number;
  subject: string;
}

export interface Absence {
  id: string;
  date: string;
  student_id: string;
  student_name: string;
  committee_number: string;
  period: number;
  type: 'ABSENT' | 'LATE';
  proctor_id: string;
  note?: string; 
}

export interface ControlRequest {
  id: string;
  from: string;
  committee: string;
  text: string;
  time: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'REJECTED';
  assistant_name?: string;
}

export interface DeliveryLog {
  id: string;
  teacher_name: string;
  proctor_name?: string; 
  committee_number: string;
  grade: string; 
  type: 'ISSUE' | 'RECEIVE';
  time: string;
  period: number;
  status?: 'CONFIRMED' | 'PENDING';
}

export interface CommitteeReport {
  id: string;
  committee_number: string;
  proctor_id: string;
  proctor_name: string;
  date: string;
  observations: string;
  issues: string;
  resolutions: string;
}

export interface SystemConfig {
  id: string;
  exam_start_time: string; 
  exam_date: string;
  active_exam_date?: string;
  allow_manual_join?: boolean;
}
