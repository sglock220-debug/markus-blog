<template>
  <div class="container auth-container">
    <div class="auth-card">
      <div class="auth-tabs">
        <button 
          :class="['tab-btn', { active: activeTab === 'login' }]" 
          @click="activeTab = 'login'"
        >登录</button>
        <button 
          :class="['tab-btn', { active: activeTab === 'register' }]" 
          @click="activeTab = 'register'"
        >注册</button>
      </div>

      <div v-if="activeTab === 'login'" class="auth-section">
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label>用户名</label>
            <input v-model="loginForm.username" type="text" required autofocus>
          </div>
          <div class="form-group">
            <label>密码</label>
            <input v-model="loginForm.password" type="password" required>
          </div>
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>
        <p v-if="error" class="form-errors">{{ error }}</p>
      </div>

      <div v-else class="auth-section">
        <form @submit.prevent="handleRegister">
          <div class="form-group">
            <label>用户名</label>
            <input v-model="registerForm.username" type="text" required>
          </div>
          <div class="form-group">
            <label>邮箱</label>
            <input v-model="registerForm.email" type="email" required>
          </div>
          <div class="form-group">
            <label>密码</label>
            <input v-model="registerForm.password" type="password" required>
          </div>
          <div class="form-group">
            <label>确认密码</label>
            <input v-model="registerForm.confirm_password" type="password" required>
          </div>
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? '注册中...' : '注册' }}
          </button>
        </form>
        <p v-if="error" class="form-errors">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api, { getCsrfToken } from '../api';

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
    const response = await api.post('/login/', {
      username: loginForm.value.username,
      password: loginForm.value.password
    });
    console.log('Login success:', response.data);
    router.push('/');
  } catch (err) {
    console.log('Login error data:', err.response?.data);
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
      register_submit: true // Compatibility
    });
    router.push('/');
  } catch (err) {
    error.value = Object.values(err.response?.data || {}).flat()[0] || '注册失败';
  } finally {
    loading.value = false;
  }
};
</script>
