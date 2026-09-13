export type Locale = 'ar' | 'en';

export interface Translations {
  appName: string;
  nav: {
    dashboard: string;
    nodes: string;
  };
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
  nodes: {
    title: string;
    addNode: string;
    name: string;
    type: string;
    environment: string;
    host: string;
    port: string;
    apiBaseUrl: string;
    authMethod: string;
    secret: string;
    tlsVerify: string;
    pollingInterval: string;
    create: string;
    cancel: string;
    health: string;
    collector: string;
    actions: string;
    testConnection: string;
    enable: string;
    disable: string;
    delete: string;
    rotateCredential: string;
    start: string;
    stop: string;
    restart: string;
    confirmDeleteTitle: string;
    confirmPassword: string;
    confirm: string;
    testResultsTitle: string;
    close: string;
    empty: string;
    newSecret: string;
  };
  common: {
    loading: string;
  };
}

export const translations: Record<Locale, Translations> = {
  ar: {
    appName: 'نظام مراقبة SOC المباشر',
    nav: {
      dashboard: 'الرئيسية',
      nodes: 'التكاملات والأجهزة',
    },
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
    nodes: {
      title: 'التكاملات والأجهزة',
      addNode: 'إضافة جهاز',
      name: 'الاسم',
      type: 'النوع',
      environment: 'البيئة',
      host: 'العنوان / IP',
      port: 'المنفذ',
      apiBaseUrl: 'رابط API',
      authMethod: 'طريقة المصادقة',
      secret: 'API Token / كلمة المرور',
      tlsVerify: 'التحقق من شهادة TLS',
      pollingInterval: 'فترة الفحص (ثانية)',
      create: 'إنشاء',
      cancel: 'إلغاء',
      health: 'الحالة',
      collector: 'جامع البيانات',
      actions: 'إجراءات',
      testConnection: 'اختبار الاتصال',
      enable: 'تفعيل',
      disable: 'تعطيل',
      delete: 'حذف',
      rotateCredential: 'تدوير المفتاح',
      start: 'تشغيل',
      stop: 'إيقاف',
      restart: 'إعادة تشغيل',
      confirmDeleteTitle: 'تأكيد الحذف — يتطلب كلمة المرور الحالية',
      confirmPassword: 'كلمة المرور الحالية',
      confirm: 'تأكيد',
      testResultsTitle: 'نتائج اختبار الاتصال',
      close: 'إغلاق',
      empty: 'لا توجد أجهزة مضافة بعد.',
      newSecret: 'القيمة الجديدة',
    },
    common: {
      loading: 'جارٍ التحميل...',
    },
  },
  en: {
    appName: 'SOC Live Monitoring System',
    nav: {
      dashboard: 'Dashboard',
      nodes: 'Integrations & Nodes',
    },
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
    nodes: {
      title: 'Integrations & Nodes',
      addNode: 'Add Node',
      name: 'Name',
      type: 'Type',
      environment: 'Environment',
      host: 'Host / IP',
      port: 'Port',
      apiBaseUrl: 'API Base URL',
      authMethod: 'Auth Method',
      secret: 'API Token / Password',
      tlsVerify: 'Verify TLS certificate',
      pollingInterval: 'Polling interval (seconds)',
      create: 'Create',
      cancel: 'Cancel',
      health: 'Health',
      collector: 'Collector',
      actions: 'Actions',
      testConnection: 'Test Connection',
      enable: 'Enable',
      disable: 'Disable',
      delete: 'Delete',
      rotateCredential: 'Rotate Credential',
      start: 'Start',
      stop: 'Stop',
      restart: 'Restart',
      confirmDeleteTitle: 'Confirm delete — requires your current password',
      confirmPassword: 'Current password',
      confirm: 'Confirm',
      testResultsTitle: 'Test Connection Results',
      close: 'Close',
      empty: 'No nodes have been added yet.',
      newSecret: 'New value',
    },
    common: {
      loading: 'Loading...',
    },
  },
};
