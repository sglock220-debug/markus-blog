import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import api, { getCsrfToken } from '../api';

export function useAuth() {
  const router = useRouter();
  const activeTab = ref('login');
  const loading = ref(false);
  const error = ref('');

  const loginForm = ref({
    username: '',
    password: ''
  });

  // --- Registration State ---
  const currentStep = ref(1); // 最高解锁的步骤
  const openStep = ref(1);    // 当前展开的步骤

  const registerForm = ref({
    invitation_code: '',
    username: '',
    nickname: '',
    password: '',
    confirm_password: '',
    captcha: '',
    email: '',
    email_code: ''
  });

  const registerErrors = ref({});
  const registerSuccess = ref({});
  
  const emailSent = ref(false);
  const emailVerified = ref(false);

  const captchaImage = ref('');
  const emailTimer = ref(0);
  let timerInterval = null;

  // Login handler
  const handleLogin = async () => {
    loading.value = true;
    error.value = '';
    try {
      await getCsrfToken();
      await api.post('/login/', {
        username: loginForm.value.username,
        password: loginForm.value.password
      });
      // 清除游客模式
      sessionStorage.removeItem('entry_mode');
      window.dispatchEvent(new Event('auth-changed'));
      router.push('/');
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.detail || '登录失败，请检查用户名和密码';
    } finally {
      loading.value = false;
    }
  };

  // --- Registration Handlers ---
  const clearError = (field) => {
    if (registerErrors.value[field]) {
      registerErrors.value[field] = '';
    }
  };

  const toggleStep = (step) => {
    if (step <= currentStep.value) {
      openStep.value = openStep.value === step ? null : step;
    }
  };

  // 1. 内推码处理
  const handleInvitationCodeInput = () => {
    if (registerSuccess.value['invitation_code']) return;
    clearError('invitation_code');
  };

  const verifyInvitationCode = async () => {
    if (registerSuccess.value['invitation_code']) return;
    clearError('invitation_code');
    if (!registerForm.value.invitation_code) {
      registerErrors.value['invitation_code'] = '请输入内推码';
      return;
    }
    
    loading.value = true;
    try {
      await getCsrfToken();
      await api.post('/register/verify-invitation-code/', {
        invitation_code: registerForm.value.invitation_code
      });
      registerSuccess.value.invitation_code = '验证成功';
      if (currentStep.value < 2) currentStep.value = 2;
      openStep.value = 2;
    } catch (err) {
      registerErrors.value['invitation_code'] = err.response?.data?.error || '内推码验证失败';
    } finally {
      loading.value = false;
    }
  };

  // 2. 账户信息处理
  const sanitizeName = (value) => 
    value.replace(/[^A-Za-z0-9\u4e00-\u9fff]/g, '').slice(0, 15);

  const sanitizePassword = (value) => 
    value.replace(/\s/g, '').slice(0, 15);

  let isComposing = false;

  const handleCompositionStart = () => {
    isComposing = true;
  };

  const handleCompositionEnd = (event, field) => {
    isComposing = false;
    if (field === 'username') handleUsernameInput(event);
    else if (field === 'nickname') handleNicknameInput(event);
    else if (field === 'password') handlePasswordInput(event);
    else if (field === 'confirm_password') handleConfirmPasswordInput(event);
  };

  const handleUsernameInput = event => {
    if (isComposing) return;
    const cleanValue = sanitizeName(event.target.value);
    if (event.target.value !== cleanValue) {
      event.target.value = cleanValue;
    }
    registerForm.value.username = cleanValue;
    clearError('username');
    registerSuccess.value.username = '';
    registerSuccess.value.step2 = '';
  };

  const handleNicknameInput = event => {
    if (isComposing) return;
    const cleanValue = sanitizeName(event.target.value);
    if (event.target.value !== cleanValue) {
      event.target.value = cleanValue;
    }
    registerForm.value.nickname = cleanValue;
    clearError('nickname');
    registerSuccess.value.step2 = '';
  };

  const handlePasswordInput = event => {
    if (isComposing) return;
    const cleanValue = sanitizePassword(event.target.value);
    if (event.target.value !== cleanValue) {
      event.target.value = cleanValue;
    }
    registerForm.value.password = cleanValue;
    clearError('password');
    registerSuccess.value.step2 = '';
  };

  const handleConfirmPasswordInput = event => {
    if (isComposing) return;
    const cleanValue = sanitizePassword(event.target.value);
    if (event.target.value !== cleanValue) {
      event.target.value = cleanValue;
    }
    registerForm.value.confirm_password = cleanValue;
    clearError('confirm_password');
    registerSuccess.value.step2 = '';
  };

  const checkUsername = async () => {
    if (!registerSuccess.value['invitation_code']) {
      registerErrors.value['invitation_code'] = '请先完成内推码验证';
      currentStep.value = 1;
      openStep.value = 1;
      return;
    }
    clearError('username');
    if (!registerForm.value.username) return;
    
    try {
      await getCsrfToken();
      await api.post('/register/check-username/', {
        username: registerForm.value.username
      });
      registerSuccess.value['username'] = '账户名可用';
    } catch (err) {
      registerErrors.value['username'] = err.response?.data?.error || '账户名检查失败';
      registerSuccess.value['username'] = '';
    }
  };

  const handleStep2Input = (field) => {
    clearError(field);
    registerSuccess.value['step2'] = '';
  };

  const submitStep2 = async () => {
    if (!registerSuccess.value.invitation_code) {
      registerErrors.value.invitation_code = '验证失败';
      currentStep.value = 1;
      openStep.value = 1;
      return;
    }
    
    clearError('username');
    clearError('nickname');
    clearError('password');
    clearError('confirm_password');

    let hasError = false;
    if (!registerForm.value.username) {
      registerErrors.value.username = '不能为空';
      hasError = true;
    }
    if (!registerForm.value.nickname) {
      registerErrors.value.nickname = '不能为空';
      hasError = true;
    }
    if (!registerForm.value.password) {
      registerErrors.value.password = '不能为空';
      hasError = true;
    } else if (registerForm.value.password.length < 8) {
      registerErrors.value.password = '密码过短';
      hasError = true;
    }
    if (!registerForm.value.confirm_password) {
      registerErrors.value.confirm_password = '不能为空';
      hasError = true;
    }

    if (registerForm.value.password && registerForm.value.confirm_password && registerForm.value.password !== registerForm.value.confirm_password) {
      registerErrors.value.confirm_password = '两次不一致';
      hasError = true;
    }

    if (hasError) return;

    if (!registerSuccess.value.username) {
      await checkUsername();
      if (registerErrors.value.username) return;
    }

    registerSuccess.value.step2 = '信息已完善';
    registerSuccess.value.confirm_password = '密码一致';
    if (currentStep.value < 3) currentStep.value = 3;
    openStep.value = 3;
    
    if (!captchaImage.value) {
      await refreshCaptcha();
    }
  };

  // 3. 人机验证处理
  const handleCaptchaInput = () => {
    if (registerSuccess.value['captcha']) return;
    clearError('captcha');
  };

  const refreshCaptcha = async () => {
    if (registerSuccess.value['captcha']) return;
    try {
      await getCsrfToken();
      const res = await api.get('/register/captcha-image/');
      captchaImage.value = res.data.image;
    } catch (err) {
      console.error('Failed to get captcha');
    }
  };

  const verifyCaptcha = async () => {
    if (registerSuccess.value['captcha']) return;
    if (!registerSuccess.value['step2']) {
      registerErrors.value['step2_block'] = '请先完善账户信息';
      currentStep.value = 2;
      openStep.value = 2;
      return;
    }
    clearError('captcha');
    if (!registerForm.value.captcha) {
      registerErrors.value['captcha'] = '请输入验证码';
      return;
    }
    
    loading.value = true;
    try {
      await getCsrfToken();
      await api.post('/register/verify-captcha/', {
        captcha: registerForm.value.captcha
      });
      registerSuccess.value['captcha'] = '验证成功';
      if (currentStep.value < 4) currentStep.value = 4;
      openStep.value = 4;
    } catch (err) {
      registerErrors.value['captcha'] = err.response?.data?.error || '验证码不正确';
      await refreshCaptcha();
    } finally {
      loading.value = false;
    }
  };

  // 4. 邮箱验证处理
  const handleEmailInput = () => {
    clearError('email');
    emailSent.value = false;
    emailVerified.value = false;
    registerForm.value.email_code = '';
    registerSuccess.value['email'] = '';
    registerSuccess.value['email_code'] = '';
    emailTimer.value = 0;
    if (timerInterval) clearInterval(timerInterval);
  };

  const handleEmailCodeInput = () => {
    clearError('email_code');
    registerSuccess.value['email_code'] = '';
  };

  const sendEmailCode = async () => {
    if (!registerSuccess.value['captcha']) {
      registerErrors.value['captcha'] = '请先完成人机验证';
      currentStep.value = 3;
      openStep.value = 3;
      return;
    }
    clearError('email');
    if (!registerForm.value.email) {
      registerErrors.value['email'] = '请输入邮箱';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerForm.value.email)) {
      registerErrors.value['email'] = '格式错误';
      return;
    }
    
    loading.value = true;
    try {
      await getCsrfToken();
      const response = await api.post('/register/send-email-code/', {
        email: registerForm.value.email
      });
      
      emailSent.value = true;
      startEmailTimer();
      
      registerSuccess.value['email'] = response.data?.message || '验证码已发送，请查收';
    } catch (err) {
      emailSent.value = false;
      emailTimer.value = 0;
      registerErrors.value['email'] = err.response?.data?.error || '发送失败';
    } finally {
      loading.value = false;
    }
  };

  const startEmailTimer = () => {
    emailTimer.value = 60;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      emailTimer.value--;
      if (emailTimer.value <= 0) {
        clearInterval(timerInterval);
      }
    }, 1000);
  };

  const handleEmailEdit = () => {
    emailSent.value = false;
    emailVerified.value = false;
    registerSuccess.value.email = '';
    registerSuccess.value.email_code = '';
    registerForm.value.email_code = '';
    emailTimer.value = 0;
    if (timerInterval) clearInterval(timerInterval);
  };

  const verifyEmailCode = async () => {
    if (!registerSuccess.value.captcha) {
      registerErrors.value.email_code = '请先完成人机验证';
      currentStep.value = 3;
      openStep.value = 3;
      return;
    }

    if (!registerForm.value.email_code) {
      registerErrors.value.email_code = '不能为空';
      return;
    }

    loading.value = true;
    clearError('email_code');
    try {
      await getCsrfToken();
      const response = await api.post('/register/verify-email-code/', {
        email: registerForm.value.email,
        email_code: registerForm.value.email_code
      });
      registerSuccess.value.email_code = response.data.message || '验证成功';
      emailVerified.value = true;
      if (timerInterval) clearInterval(timerInterval);
    } catch (err) {
      emailVerified.value = false;
      registerErrors.value.email_code = err.response?.data?.error || '验证失败';
    } finally {
      loading.value = false;
    }
  };

  const isAllValid = computed(() => {
    return registerSuccess.value['invitation_code'] &&
           registerSuccess.value['step2'] &&
           registerSuccess.value['captcha'] &&
           emailVerified.value;
  });

  const handleRegister = async () => {
    if (!isAllValid.value) {
      registerErrors.value['final'] = '请先完成所有验证步骤';
      return;
    }
    
    loading.value = true;
    clearError('final');
    
    try {
      await getCsrfToken();
      await api.post('/register/final/', {
        invitation_code: registerForm.value.invitation_code,
        username: registerForm.value.username,
        nickname: registerForm.value.nickname,
        password: registerForm.value.password,
        confirm_password: registerForm.value.confirm_password,
        captcha: registerForm.value.captcha,
        email: registerForm.value.email,
        email_code: registerForm.value.email_code
      });
      
      await api.post('/login/', {
        username: registerForm.value.username,
        password: registerForm.value.password
      });
      // 清除游客模式
      sessionStorage.removeItem('entry_mode');
      window.dispatchEvent(new Event('auth-changed'));
      router.push('/');
    } catch (err) {
      const data = err.response?.data;
      if (data?.field) {
        registerErrors.value[data.field] = data.error;
        // 自动展开包含错误的步骤
        if (data.field === 'invitation_code') openStep.value = 1;
        else if (['username', 'nickname', 'password', 'confirm_password'].includes(data.field)) openStep.value = 2;
        else if (data.field === 'captcha') openStep.value = 3;
        else if (['email', 'email_code'].includes(data.field)) openStep.value = 4;
      } else {
        registerErrors.value['final'] = data?.error || '注册失败';
      }
    } finally {
      loading.value = false;
    }
  };

  return {
    activeTab,
    loading,
    error,
    loginForm,
    
    // Register states
    currentStep,
    openStep,
    registerForm,
    registerErrors,
    registerSuccess,
    captchaImage,
    emailTimer,
    isAllValid,
    
    // Register actions
    clearError,
    toggleStep,
    handleCompositionStart,
    handleCompositionEnd,
    handleInvitationCodeInput,
    verifyInvitationCode,
    handleUsernameInput,
    handleNicknameInput,
    handlePasswordInput,
    handleConfirmPasswordInput,
    checkUsername,
    handleStep2Input,
    submitStep2,
    handleCaptchaInput,
    refreshCaptcha,
    verifyCaptcha,
    handleEmailInput,
    handleEmailCodeInput,
    sendEmailCode,
    verifyEmailCode,
    handleEmailEdit,
    
    handleLogin,
    handleRegister,
    emailSent,
    emailVerified
  };
}
