
import { createClient } from '@supabase/supabase-js';
import { User, Student, Absence, Supervision, ControlRequest, DeliveryLog, SystemConfig } from './types';

const supabaseUrl = 'https://upfavagxyuwnqmjgiibo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZmF2YWd4eXV3bnFtamdpaWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDQ0OTYsImV4cCI6MjA4MTk4MDQ5Nn0.AxsPO_Vw04aVuoa2KkFS_63OX1lz1yYthzBLLIkotuw';

export const supabase = createClient(supabaseUrl, supabaseKey);

const handleError = (error: any, context: string) => {
  if (error) {
    console.error(`Supabase Error [${context}]:`, error);
    // تحويل الخطأ إلى نص واضح بدلاً من [object Object]
    let message = 'خطأ غير معروف';
    if (typeof error === 'string') message = error;
    else if (error.message) message = error.message;
    else if (error.details) message = error.details;
    else message = JSON.stringify(error);

    throw new Error(`${context}: ${message}`);
  }
};

export const db = {
  users: {
    getAll: async () => {
      const { data, error } = await supabase.from('users').select('*');
      handleError(error, "users.getAll");
      return (data || []) as User[];
    },
    getById: async (nationalId: string) => {
      const { data, error } = await supabase.from('users').select('*').eq('national_id', nationalId).single();
      if (error && error.code !== 'PGRST116') handleError(error, "users.getById");
      return data as User;
    },
    upsert: async (users: any[]) => {
      const { error } = await supabase.from('users').upsert(users, { onConflict: 'national_id' });
      handleError(error, "users.upsert");
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      handleError(error, "users.delete");
    }
  },

  students: {
    getAll: async () => {
      const { data, error } = await supabase.from('students').select('*');
      handleError(error, "students.getAll");
      return (data || []) as Student[];
    },
    upsert: async (students: any[]) => {
      const { error } = await supabase.from('students').upsert(students, { onConflict: 'national_id' });
      handleError(error, "students.upsert");
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('students').delete().eq('id', id);
      handleError(error, "students.delete");
    }
  },

  controlRequests: {
    getAll: async () => {
      const { data, error } = await supabase.from('control_requests').select('*').order('id', { ascending: false });
      handleError(error, "controlRequests.getAll");
      return (data || []).map((d: any) => ({
        id: d.id,
        from: d.from_user_name,
        committee: d.committee_number,
        text: d.text,
        time: d.time,
        status: d.status,
        assistant_name: d.assistant_name
      })) as ControlRequest[];
    },
    insert: async (req: Partial<ControlRequest>) => {
      const { error } = await supabase.from('control_requests').insert([{
        from_user_name: req.from,
        committee_number: req.committee,
        text: req.text,
        time: req.time,
        status: req.status || 'PENDING'
      }]);
      handleError(error, "controlRequests.insert");
    },
    updateStatus: async (id: string, status: string, assistantName?: string) => {
      const updateData: any = { status };
      if (assistantName) updateData.assistant_name = assistantName;
      const { error } = await supabase.from('control_requests').update(updateData).eq('id', id);
      handleError(error, "controlRequests.updateStatus");
    }
  },

  absences: {
    getAll: async () => {
      const { data, error } = await supabase.from('absences').select('*');
      handleError(error, "absences.getAll");
      return (data || []) as Absence[];
    },
    upsert: async (absence: Partial<Absence>) => {
      const { error } = await supabase.from('absences').upsert([absence], { onConflict: 'student_id' });
      handleError(error, "absences.upsert");
    },
    delete: async (studentId: string) => {
      const { error } = await supabase.from('absences').delete().eq('student_id', studentId);
      handleError(error, "absences.delete");
    }
  },

  supervision: {
    getAll: async () => {
      const { data, error } = await supabase.from('supervision').select('*');
      handleError(error, "supervision.getAll");
      return (data || []) as Supervision[];
    },
    insert: async (sv: Partial<Supervision>) => {
      const { error } = await supabase.from('supervision').insert([sv]);
      handleError(error, "supervision.insert");
    },
    deleteByTeacherId: async (teacherId: string) => {
      const { error } = await supabase.from('supervision').delete().eq('teacher_id', teacherId);
      handleError(error, "supervision.delete");
    }
  },

  deliveryLogs: {
    getAll: async () => {
      const { data, error } = await supabase.from('delivery_logs').select('*');
      handleError(error, "deliveryLogs.getAll");
      return (data || []) as DeliveryLog[];
    },
    upsert: async (log: Partial<DeliveryLog>) => {
      const { error } = await supabase.from('delivery_logs').upsert([log], { onConflict: 'id' });
      handleError(error, "deliveryLogs.upsert");
    }
  },

  config: {
    get: async () => {
      const { data, error } = await supabase.from('system_config').select('*').single();
      if (error && error.code !== 'PGRST116') handleError(error, "config.get");
      return data as SystemConfig;
    },
    upsert: async (config: Partial<SystemConfig>) => {
      const { error } = await supabase.from('system_config').upsert([{ ...config, id: 'main_config' }], { onConflict: 'id' });
      handleError(error, "config.upsert");
    }
  },

  notifications: {
    broadcast: async (text: string, targetRole: string, sender: string) => {
      const { error } = await supabase.from('notifications').insert([{ text, target_role: targetRole, sender_name: sender }]);
      handleError(error, "notifications.broadcast");
    }
  }
};
