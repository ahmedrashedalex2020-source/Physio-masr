export interface User {
  email: string;
  name: string;
  role: string;
}

const AUTH_STORAGE_KEY = 'physio_auth_user_v1';

// Configured credentials
export const AUTHORIZED_USERS = [
  {
    email: 'mayalaa560@gmail.com',
    password: 'alaa1234',
    name: 'د. مي علاء',
    role: 'أخصائي العلاج الطبيعي والإدارة',
  },
  {
    email: 'ahmedrashedalex2020@gmail.com',
    password: 'alaa1234',
    name: 'الإدارة العامة',
    role: 'مدير النظام',
  },
];

export const AuthService = {
  getCurrentUser(): User | null {
    try {
      const data = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  login(email: string, password: string): { success: boolean; user?: User; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const matchedUser = AUTHORIZED_USERS.find(
      (u) => u.email.toLowerCase() === cleanEmail && u.password === cleanPassword
    );

    if (matchedUser) {
      const user: User = {
        email: matchedUser.email,
        name: matchedUser.name,
        role: matchedUser.role,
      };
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } catch (e) {
        console.error(e);
      }
      return { success: true, user };
    }

    return {
      success: false,
      error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات والمحاولة مجدداً.',
    };
  },

  logout(): void {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  },

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },
};
