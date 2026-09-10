export type Locale = 'ar' | 'en';

export interface Translations {
  appName: string;
  login: {
    title: string;
    username: string;
    password: string;
    submit: string;
    error: string;
  };
  dashboard: {
    welcome: string;
    logout: string;
    roles: string;
    permissions: string;
    placeholderNotice: string;
  };
  common: {
    loading: string;
  };
}

export const translations: Record<Locale, Translations> = {
  ar: {
    appName: 'نظام مراقبة SOC المباشر',
    login: {
      title: 'تسجيل الدخول',
      username: 'اسم المستخدم',
      password: 'كلمة المرور',
      submit: 'دخول',
      error: 'خطأ',
    },
    dashboard: {
      welcome: 'مرحباً',
      logout: 'تسجيل الخروج',
      roles: 'الأدوار',
      permissions: 'الصلاحيات',
      placeholderNotice:
        'لوحات المراقبة التفصيلية (FortiGate، FortiWeb، Active Directory، الامتثال) تُبنى في المراحل القادمة. هذه واجهة المصادقة والتحكم بالصلاحيات الخاصة بالمرحلة الأولى فقط.',
    },
    common: {
      loading: 'جارٍ التحميل...',
    },
  },
  en: {
    appName: 'SOC Live Monitoring System',
    login: {
      title: 'Sign in',
      username: 'Username',
      password: 'Password',
      submit: 'Sign in',
      error: 'Error',
    },
    dashboard: {
      welcome: 'Welcome',
      logout: 'Log out',
      roles: 'Roles',
      permissions: 'Permissions',
      placeholderNotice:
        'Detailed monitoring dashboards (FortiGate, FortiWeb, Active Directory, Compliance) are built in later phases. This is the Phase 1 authentication and authorization shell only.',
    },
    common: {
      loading: 'Loading...',
    },
  },
};
