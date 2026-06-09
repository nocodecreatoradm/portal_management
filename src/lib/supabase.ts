const authListeners: ((event: string, session: any) => void)[] = [];

class SupabaseQueryBuilder {
  private table: string;
  private method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET';
  private selectCols: string = '*';
  private filters: { field: string; op: string; value: any }[] = [];
  private orderCol?: string;
  private orderAscending: boolean = true;
  private limitCount?: number;
  private payload?: any;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private isUpsert: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(cols: string = '*') {
    this.selectCols = cols;
    return this;
  }

  insert(data: any | any[]) {
    this.method = 'POST';
    this.payload = data;
    return this;
  }

  upsert(data: any | any[], options?: any) {
    this.method = 'POST';
    this.payload = data;
    this.isUpsert = true;
    return this;
  }

  update(data: any) {
    this.method = 'PUT';
    this.payload = data;
    return this;
  }

  delete() {
    this.method = 'DELETE';
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, op: 'eq', value });
    return this;
  }

  neq(field: string, value: any) {
    this.filters.push({ field, op: 'neq', value });
    return this;
  }

  in(field: string, value: any[]) {
    this.filters.push({ field, op: 'in', value });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderCol = field;
    this.orderAscending = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  // Thenable interface so it can be directly awaited
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const res = await this.execute();
      if (onfulfilled) {
        return onfulfilled(res);
      }
      return res;
    } catch (err) {
      if (onrejected) {
        return onrejected(err);
      }
      throw err;
    }
  }

  private async execute() {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const body = JSON.stringify({
      table: this.table,
      method: this.method,
      select: this.selectCols,
      filters: this.filters,
      orderCol: this.orderCol,
      orderAscending: this.orderAscending,
      limit: this.limitCount,
      payload: this.payload,
      isSingle: this.isSingle,
      isMaybeSingle: this.isMaybeSingle,
      isUpsert: this.isUpsert,
    });

    const response = await fetch('/api/db/query', {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed.error || errText;
      } catch {}
      return { data: null, error: { message: errMsg } };
    }

    const data = await response.json();
    return { data, error: null };
  }
}

export const supabase = {
  auth: {
    async signUp({ email, password, options }: any) {
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, fullName: options?.data?.full_name })
        });
        if (!res.ok) {
          const err = await res.json();
          return { data: null, error: { message: err.error || 'Registration failed' } };
        }
        const data = await res.json();
        return { data, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message || 'Registration failed' } };
      }
    },

    async signInWithPassword({ email, password }: any) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
          const err = await res.json();
          return { data: null, error: { message: err.error || 'Login failed' } };
        }
        const data = await res.json();
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        
        authListeners.forEach(cb => cb('SIGNED_IN', data.session));
        return { data: { user: data.user, session: data.session }, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message || 'Login failed' } };
      }
    },

    async signOut() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      authListeners.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    },

    async getSession() {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('auth_user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          const session = { access_token: token, user };
          return { data: { session }, error: null };
        } catch {
          return { data: { session: null }, error: null };
        }
      }
      return { data: { session: null }, error: null };
    },

    onAuthStateChange(callback: any) {
      authListeners.push(callback);

      // Check URL query parameters for recovery flow
      const params = new URLSearchParams(window.location.search);
      const isRecoveryFlow = params.get('recovery') === 'true';
      const recoveryToken = params.get('token');
      const recoveryEmail = params.get('email');

      if (isRecoveryFlow && recoveryToken && recoveryEmail) {
        // Initialize recovery session state
        localStorage.setItem('auth_token', recoveryToken);
        localStorage.setItem('auth_user', JSON.stringify({ email: recoveryEmail }));
        
        // Clean URL parameters from the browser history
        try {
          const newUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } catch (e) {
          console.error('Failed to clean recovery URL parameters:', e);
        }

        // Trigger the recovery callback after a tiny delay to ensure listeners are ready
        setTimeout(() => {
          callback('PASSWORD_RECOVERY', {
            access_token: recoveryToken,
            user: { email: recoveryEmail }
          });
        }, 100);
      } else {
        this.getSession().then(({ data: { session } }) => {
          callback(session ? 'INITIAL_SESSION' : 'SIGNED_OUT', session);
        });
      }

      return {
        data: {
          subscription: {
            unsubscribe() {
              const idx = authListeners.indexOf(callback);
              if (idx !== -1) authListeners.splice(idx, 1);
            }
          }
        }
      };
    },

    async updateUser({ password }: any) {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/auth/update-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ password })
        });
        if (!res.ok) {
          const err = await res.json();
          return { data: null, error: { message: err.error || 'Update failed' } };
        }
        const data = await res.json();
        return { data, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message || 'Update failed' } };
      }
    },

    async resetPasswordForEmail(email: string, options?: any) {
      try {
        const res = await fetch('/api/auth/reset-password-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        if (!res.ok) {
          const err = await res.json();
          return { data: null, error: { message: err.error || 'Request failed' } };
        }
        return { data: {}, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message || 'Request failed' } };
      }
    }
  },

  from(table: string) {
    return new SupabaseQueryBuilder(table);
  }
};
