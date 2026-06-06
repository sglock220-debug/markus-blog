import { ref } from 'vue';
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

  const registerForm = ref({
    username: '',
    email: '',
    password: '',
    confirm_password: ''
  });

  const handleLogin = async () => {
    loading.value = true;
    error.value = '';
    try {
      await getCsrfToken();
      await api.post('/login/', {
        username: loginForm.value.username,
        password: loginForm.value.password
      });
      router.push('/');
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.detail || '登录失败，请检查用户名和密码';
    } finally {
      loading.value = false;
    }
  };

  const handleRegister = async () => {
    if (registerForm.value.password !== registerForm.value.confirm_password) {
      error.value = '两次输入的密码不一致';
      return;
    }

    loading.value = true;
    error.value = '';
    try {
      await getCsrfToken();
      await api.post('/register/', {
        ...registerForm.value,
        register_submit: true
      });
      router.push('/');
    } catch (err) {
      error.value = Object.values(err.response?.data || {}).flat()[0] || '注册失败';
    } finally {
      loading.value = false;
    }
  };

  return {
    activeTab,
    loading,
    error,
    loginForm,
    registerForm,
    handleLogin,
    handleRegister
  };
}
