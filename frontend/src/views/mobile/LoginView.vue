<template>
  <div class="mobile-auth">
    <div class="mobile-auth-header">
      <img src="/Logo.png" alt="Logo" class="auth-logo" />
      <h1>欢迎回来</h1>
      <p>登录以同步您的学习进度</p>
    </div>

    <div class="mobile-auth-card">
      <div class="mobile-auth-tabs">
        <button 
          :class="['m-tab-btn', { active: activeTab === 'login' }]" 
          @click="activeTab = 'login'"
        >登录</button>
        <button 
          :class="['m-tab-btn', { active: activeTab === 'register' }]" 
          @click="activeTab = 'register'"
        >注册</button>
      </div>

      <div v-if="activeTab === 'login'" class="mobile-auth-section">
        <form @submit.prevent="handleLogin">
          <div class="m-form-group">
            <label>用户名</label>
            <input v-model="loginForm.username" type="text" required placeholder="请输入用户名">
          </div>
          <div class="m-form-group">
            <label>密码</label>
            <input v-model="loginForm.password" type="password" required placeholder="请输入密码">
          </div>
          <button type="submit" class="m-btn-primary" :disabled="loading">
            {{ loading ? '登录中...' : '立即登录' }}
          </button>
        </form>
        <p v-if="error" class="m-error">{{ error }}</p>
      </div>

      <div v-else class="mobile-auth-section">
        <form @submit.prevent="handleRegister">
          <div class="m-form-group">
            <label>用户名</label>
            <input v-model="registerForm.username" type="text" required placeholder="起个响亮的名字">
          </div>
          <div class="m-form-group">
            <label>邮箱</label>
            <input v-model="registerForm.email" type="email" required placeholder="用于找回密码">
          </div>
          <div class="m-form-group">
            <label>密码</label>
            <input v-model="registerForm.password" type="password" required placeholder="至少6位字符">
          </div>
          <div class="m-form-group">
            <label>确认密码</label>
            <input v-model="registerForm.confirm_password" type="password" required placeholder="再次输入密码">
          </div>
          <button type="submit" class="m-btn-primary" :disabled="loading">
            {{ loading ? '注册中...' : '立即注册' }}
          </button>
        </form>
        <p v-if="error" class="m-error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuth } from '../../composables/useAuth';

const {
  activeTab,
  loading,
  error,
  loginForm,
  registerForm,
  handleLogin,
  handleRegister
} = useAuth();
</script>

<style scoped>
.mobile-auth {
  padding: 20px 16px;
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.mobile-auth-header {
  text-align: center;
  margin-bottom: 32px;
  margin-top: 20px;
}

.auth-logo {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
}

.mobile-auth-header h1 {
  font-size: 1.75rem;
  margin-bottom: 8px;
}

.mobile-auth-header p {
  color: var(--secondary-text);
}

.mobile-auth-card {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 24px;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border-color);
}

.mobile-auth-tabs {
  display: flex;
  background: var(--bg-color);
  padding: 4px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.m-tab-btn {
  flex: 1;
  height: 44px;
  border: none;
  background: none;
  font-weight: bold;
  color: var(--secondary-text);
  border-radius: 10px;
}

.m-tab-btn.active {
  background: var(--card-bg);
  color: var(--accent-color);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.m-form-group {
  margin-bottom: 20px;
}

.m-form-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.m-form-group input {
  width: 100%;
  height: 48px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0 16px;
  color: var(--text-color);
  font-size: 1rem;
}

.m-btn-primary {
  width: 100%;
  height: 52px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 26px;
  font-size: 1.1rem;
  font-weight: bold;
  margin-top: 12px;
}

.m-btn-primary:disabled {
  opacity: 0.6;
}

.m-error {
  color: #ff4d4f;
  text-align: center;
  margin-top: 16px;
  font-size: 0.9rem;
}
</style>
