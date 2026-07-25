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

      <!-- 登录部分 -->
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

      <!-- 注册部分 (折叠式分步) -->
      <div v-else class="mobile-auth-section register-section">
        
        <!-- Step 1: 内推码 -->
        <div class="step-box" :class="{ 'step-disabled': currentStep < 1, 'step-open': openStep === 1 }">
          <div class="step-header" @click="toggleStep(1)">
            <div class="step-title">
              <span class="step-num">1</span> 内推码验证
              <span v-if="registerSuccess.invitation_code && openStep !== 1" class="step-summary">
                <i class="success-icon">✓</i> 已验证
              </span>
            </div>
          </div>
          <div class="step-body" v-show="openStep === 1">
            <div class="input-group-row">
              <div class="input-line-wrap">
                <input v-model="registerForm.invitation_code" type="text" placeholder="10位字母和数字" @input="handleInvitationCodeInput" :readonly="!!registerSuccess.invitation_code">
                <span v-if="registerErrors.invitation_code" class="field-status field-status-error" :title="registerErrors.invitation_code">{{ registerErrors.invitation_code }}</span>
                <span v-else-if="registerSuccess.invitation_code" class="field-status field-status-success" :title="registerSuccess.invitation_code">{{ registerSuccess.invitation_code }}</span>
              </div>
              <button type="button" class="btn-secondary" @click="verifyInvitationCode" :disabled="loading || !!registerSuccess.invitation_code">{{ registerSuccess.invitation_code ? '已验证' : '验证' }}</button>
            </div>
          </div>
        </div>

        <!-- Step 2: 账户信息 -->
        <div class="step-box" :class="{ 'step-disabled': currentStep < 2, 'step-open': openStep === 2 }">
          <div class="step-header" @click="toggleStep(2)">
            <div class="step-title">
              <span class="step-num">2</span> 账户信息
              <span v-if="registerSuccess.step2 && openStep !== 2" class="step-summary">
                <i class="success-icon">✓</i> {{ registerForm.username }}
              </span>
            </div>
            <button v-if="registerSuccess.step2 && openStep !== 2" class="btn-edit" @click.stop="toggleStep(2)">编辑</button>
          </div>
          <div class="step-body" v-show="openStep === 2">
            <div class="m-form-group">
              <label>账户名</label>
              <div class="input-line-wrap">
                <input v-model="registerForm.username" type="text" placeholder="1~15字符" maxlength="15" @blur="checkUsername" @input="handleUsernameInput" @compositionstart="handleCompositionStart" @compositionend="e => handleCompositionEnd(e, 'username')">
                <span v-if="registerErrors.username" class="field-status field-status-error" :title="registerErrors.username">{{ registerErrors.username }}</span>
                <span v-else-if="registerSuccess.username" class="field-status field-status-success" :title="registerSuccess.username">{{ registerSuccess.username }}</span>
              </div>
            </div>
            <div class="m-form-group">
              <label>昵称</label>
              <div class="input-line-wrap">
                <input v-model="registerForm.nickname" type="text" placeholder="1~15字符" maxlength="15" @input="handleNicknameInput" @compositionstart="handleCompositionStart" @compositionend="e => handleCompositionEnd(e, 'nickname')">
                <span v-if="registerErrors.nickname" class="field-status field-status-error" :title="registerErrors.nickname">{{ registerErrors.nickname }}</span>
              </div>
            </div>
            <div class="m-form-group">
              <label>密码</label>
              <div class="input-line-wrap">
                <input v-model="registerForm.password" type="password" placeholder="8~15字符" minlength="8" maxlength="15" @input="handlePasswordInput" @compositionstart="handleCompositionStart" @compositionend="e => handleCompositionEnd(e, 'password')">
                <span v-if="registerErrors.password" class="field-status field-status-error" :title="registerErrors.password">{{ registerErrors.password }}</span>
              </div>
            </div>
            <div class="m-form-group">
              <label>确认密码</label>
              <div class="input-line-wrap">
                <input v-model="registerForm.confirm_password" type="password" placeholder="再次输入密码" minlength="8" maxlength="15" @input="handleConfirmPasswordInput" @compositionstart="handleCompositionStart" @compositionend="e => handleCompositionEnd(e, 'confirm_password')">
                <span v-if="registerErrors.confirm_password" class="field-status field-status-error" :title="registerErrors.confirm_password">{{ registerErrors.confirm_password }}</span>
              </div>
            </div>
            <button type="button" class="m-btn-primary" @click="submitStep2" :disabled="loading">下一步</button>
          </div>
        </div>

        <!-- Step 3: 人机验证 -->
        <div class="step-box" :class="{ 'step-disabled': currentStep < 3, 'step-open': openStep === 3 }">
          <div class="step-header" @click="toggleStep(3)">
            <div class="step-title">
              <span class="step-num">3</span> 人机验证
              <span v-if="registerSuccess.captcha && openStep !== 3" class="step-summary">
                <i class="success-icon">✓</i> 已通过
              </span>
            </div>
          </div>
          <div class="step-body" v-show="openStep === 3">
            <div class="captcha-row">
              <img v-if="captchaImage" :src="captchaImage" alt="captcha" class="captcha-img" @click="!registerSuccess.captcha && refreshCaptcha()" />
              <button v-if="!registerSuccess.captcha" type="button" class="btn-text" @click="refreshCaptcha">换一张</button>
            </div>
            <div class="input-group-row">
              <div class="input-line-wrap">
                <input v-model="registerForm.captcha" type="text" placeholder="请输入图中字符" @input="handleCaptchaInput" :readonly="!!registerSuccess.captcha">
                <span v-if="registerErrors.captcha" class="field-status field-status-error" :title="registerErrors.captcha">{{ registerErrors.captcha }}</span>
                <span v-else-if="registerSuccess.captcha" class="field-status field-status-success" :title="registerSuccess.captcha">{{ registerSuccess.captcha }}</span>
              </div>
              <button type="button" class="btn-secondary" @click="verifyCaptcha" :disabled="loading || !!registerSuccess.captcha">{{ registerSuccess.captcha ? '已通过' : '验证' }}</button>
            </div>
          </div>
        </div>

        <!-- Step 4: 邮箱验证 -->
        <div class="step-box" :class="{ 'step-disabled': currentStep < 4, 'step-open': openStep === 4 }">
          <div class="step-header" @click="toggleStep(4)">
            <div class="step-title">
              <span class="step-num">4</span> 邮箱验证
              <span v-if="registerSuccess.email_code && openStep !== 4" class="step-summary">
                <i class="success-icon">✓</i> {{ registerForm.email }}
              </span>
            </div>
            <button v-if="registerSuccess.email_code && openStep !== 4" class="btn-edit" @click.stop="toggleStep(4)">编辑</button>
          </div>
          <div class="step-body" v-show="openStep === 4">
            <div class="m-form-group">
              <label>邮箱</label>
              <div class="input-group-row">
                <div class="input-line-wrap">
                  <input v-model="registerForm.email" type="email" placeholder="输入邮箱" @input="handleEmailInput" :readonly="emailSent || emailVerified">
                  <span v-if="registerErrors.email" class="field-status field-status-error" :title="registerErrors.email">{{ registerErrors.email }}</span>
                  <span v-else-if="registerSuccess.email" class="field-status field-status-success" :title="registerSuccess.email">{{ registerSuccess.email }}</span>
                </div>
                <button v-if="emailSent && !emailVerified" type="button" class="btn-text" @click="handleEmailEdit">修改邮箱</button>
                <button type="button" class="btn-secondary" @click="sendEmailCode" :disabled="loading || emailTimer > 0 || emailVerified || !registerForm.email">
                  {{ loading ? '发送中...' : (emailTimer > 0 ? `${emailTimer}s` : emailSent ? '重新发送' : '发送验证码') }}
                </button>
              </div>
            </div>

            <div class="m-form-group">
              <label>验证码</label>
              <div class="input-group-row">
                <div class="input-line-wrap">
                  <input v-model="registerForm.email_code" type="text" placeholder="6位数字验证码" maxlength="6" @input="handleEmailCodeInput" :readonly="emailVerified">
                  <span v-if="registerErrors.email_code" class="field-status field-status-error" :title="registerErrors.email_code">{{ registerErrors.email_code }}</span>
                  <span v-else-if="registerSuccess.email_code" class="field-status field-status-success" :title="registerSuccess.email_code">{{ registerSuccess.email_code }}</span>
                </div>
                <button type="button" class="btn-secondary" @click="verifyEmailCode" :disabled="!emailSent || loading || emailVerified || !registerForm.email_code">
                  {{ emailVerified ? '已验证' : '验证' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <button type="button" class="m-btn-primary final-btn" @click="handleRegister" :disabled="loading || !isAllValid">
          {{ loading ? '注册中...' : '立即注册' }}
        </button>
        <p v-if="registerErrors.final" class="m-error">{{ registerErrors.final }}</p>

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
  currentStep,
  openStep,
  registerForm,
  registerErrors,
  registerSuccess,
  captchaImage,
  emailTimer,
  isAllValid,
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
  handleLogin,
  handleRegister
} = useAuth();
</script>

<style scoped>
.mobile-auth {
  padding: 20px 16px;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mobile-auth-header {
  text-align: center;
  margin-bottom: 20px;
  margin-top: 10px;
  flex-shrink: 0;
}

.auth-logo {
  width: 56px;
  height: 56px;
  margin-bottom: 12px;
}

.mobile-auth-header h1 {
  font-size: 1.5rem;
  margin-bottom: 6px;
}

.mobile-auth-header p {
  color: var(--secondary-text);
  font-size: 0.9rem;
}

.mobile-auth-card {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 20px;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border-color);
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.mobile-auth-tabs {
  display: flex;
  background: var(--bg-color);
  padding: 4px;
  border-radius: 12px;
  margin-bottom: 20px;
  flex-shrink: 0;
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

.mobile-auth-section {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-right: 4px;
  padding-bottom: 20px;
}

/* Custom scrollbar for auth-section */
.mobile-auth-section::-webkit-scrollbar {
  width: 4px;
}
.mobile-auth-section::-webkit-scrollbar-track {
  background: transparent;
}
.mobile-auth-section::-webkit-scrollbar-thumb {
  background-color: var(--border-color);
  border-radius: 2px;
}

.m-form-group {
  margin-bottom: 15px;
}

.m-form-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 6px;
}

.mobile-auth-card input { 
  width: 100%; 
  min-width: 0;
  border: none !important; 
  border-bottom: 2px solid var(--border-color) !important; 
  border-radius: 0 !important; 
  background: transparent !important; 
  padding: 9px 4px !important; 
  color: var(--text-color); 
  font-size: 0.95rem;
  outline: none !important; 
  box-shadow: none !important; 
  appearance: none;
  transition: border-color 0.2s; 
} 

.mobile-auth-card input:focus { 
  border-bottom-color: var(--accent-color) !important; 
  outline: none !important;
  box-shadow: none !important;
} 

input[readonly] { 
  background: transparent !important; 
  color: var(--text-color); 
  opacity: 1; 
  cursor: default; 
} 

.m-form-group input:disabled, .input-group-row input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.m-btn-primary {
  width: 100%;
  height: 48px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 1.05rem;
  font-weight: bold;
  margin-top: 10px;
  flex-shrink: 0;
}

.m-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.m-error {
  color: #ff4d4f;
  text-align: center;
  margin-top: 12px;
  font-size: 0.85rem;
}

/* Registration Steps Styles */
.register-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-box {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-color);
  transition: all 0.3s;
  overflow: hidden;
}

.step-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  cursor: pointer;
  background: rgba(0,0,0,0.02);
}

.step-title {
  font-weight: bold;
  color: var(--text-color);
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-num {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-color);
  color: white;
  font-size: 0.8rem;
}

.step-summary {
  font-size: 0.8rem;
  color: #2ecc71;
  font-weight: normal;
  display: flex;
  align-items: center;
  gap: 4px;
}

.success-icon {
  font-style: normal;
  font-weight: bold;
}

.btn-edit {
  background: none;
  border: none;
  color: var(--accent-color);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 4px 8px;
}

.btn-edit:hover {
  text-decoration: underline;
}

.step-body {
  padding: 0 14px 14px 14px;
  border-top: 1px solid var(--border-color);
  margin-top: 5px;
  padding-top: 14px;
}

.input-group-row {
  display: flex;
  gap: 8px;
}

.btn-secondary {
  white-space: nowrap;
  padding: 0 14px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.9rem;
}

.btn-secondary:disabled {
  background: var(--border-color);
  color: var(--secondary-text);
  cursor: not-allowed;
}

.captcha-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.captcha-img {
  height: 38px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
}

.btn-text {
  background: none;
  border: none;
  color: var(--accent-color);
  cursor: pointer;
  padding: 0;
  font-weight: bold;
  font-size: 0.9rem;
}

.inline-error {
  color: #ff4d4f;
  font-size: 0.8rem;
  margin-top: 6px;
}

.inline-success {
  color: #2ecc71;
  font-size: 0.8rem;
  margin-top: 6px;
}

.input-line-wrap { 
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: center;
  column-gap: 8px;
  width: 100%; 
  flex: 1;
  min-width: 0;
  border-bottom: 2px solid var(--border-color);
  transition: border-color 0.2s;
} 

.input-line-wrap:focus-within {
  border-bottom-color: var(--accent-color);
}

.input-line-wrap > input {
  width: 100%;
  border: none !important;
  border-bottom: none !important;
  outline: none !important;
  box-shadow: none !important;
} 

.field-status { 
  position: static; 
  width: auto;
  max-width: 96px; 
  font-size: 0.72rem; 
  line-height: 1; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  text-align: right; 
  pointer-events: none; 
} 

.field-status-success { 
  color: #2ecc71; 
} 

.field-status-error { 
  color: #ff4d4f; 
}

.final-btn {
  margin-top: 10px;
}
</style>
