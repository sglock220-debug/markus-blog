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
.auth-container { 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  min-height: calc(100vh - 200px); 
} 
 
.auth-card { 
  background: var(--card-bg); 
  padding: 30px; 
  border-radius: 12px; 
  box-shadow: var(--card-shadow); 
  width: 100%; 
  max-width: 400px; 
} 
 
.auth-tabs { 
  display: flex; 
  border-bottom: 2px solid var(--border-color); 
  margin-bottom: 20px; 
} 
 
.tab-btn { 
  flex: 1; 
  padding: 10px; 
  background: none; 
  border: none; 
  font-size: 1.1rem; 
  cursor: pointer; 
  color: var(--secondary-text); 
  transition: all 0.3s; 
} 
 
.tab-btn.active { 
  color: var(--accent-color); 
  border-bottom: 2px solid var(--accent-color); 
  margin-bottom: -2px; 
} 
 
.form-group { 
  margin-bottom: 15px; 
} 
 
.form-group label { 
  display: block; 
  margin-bottom: 5px; 
} 
 
.form-group input { 
  width: 100%; 
  padding: 10px; 
  border: 1px solid var(--border-color); 
  border-radius: 4px; 
  background: var(--bg-color); 
  color: var(--text-color); 
} 
 
.btn-primary { 
  width: 100%; 
  padding: 12px; 
  background: var(--accent-color); 
  color: #fff; 
  border: none; 
  border-radius: 4px; 
  font-size: 1rem; 
  cursor: pointer; 
  margin-top: 10px; 
} 
 
.form-errors { 
  color: #e74c3c; 
  margin-top: 10px; 
  text-align: center; 
} 
</style>
