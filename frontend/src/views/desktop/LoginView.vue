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

      <!-- 登录部分 -->
      <div v-if="activeTab === 'login'" class="auth-section">
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label>用户名</label>
            <input v-model="loginForm.username" type="text" required maxlength="15" autofocus>
          </div>
          <div class="form-group">
            <label>密码</label>
            <input v-model="loginForm.password" type="password" required maxlength="15">
          </div>
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>
        <p v-if="error" class="form-errors">{{ error }}</p>
      </div>

      <!-- 注册部分 (折叠式分步) -->
      <div v-else class="auth-section register-section">
        
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
            <div class="compact-form-row">
              <label>内推码</label>
              <div class="compact-field">
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
            <div class="compact-form-row">
              <label>账户名</label>
              <div class="compact-field">
                <div class="input-line-wrap">
                  <input v-model="registerForm.username" type="text" placeholder="1~15字符" maxlength="15" @blur="checkUsername" @input="handleUsernameInput" @compositionstart="handleCompositionStart" @compositionend="e => handleCompositionEnd(e, 'username')">
                  <span v-if="registerErrors.username" class="field-status field-status-error" :title="registerErrors.username">{{ registerErrors.username }}</span>
                  <span v-else-if="registerSuccess.username" class="field-status field-status-success" :title="registerSuccess.username">{{ registerSuccess.username }}</span>
                </div>
              </div>
            </div>
            <div class="compact-form-row">
              <label>昵称</label>
              <div class="compact-field">
                <div class="input-line-wrap">
                  <input v-model="registerForm.nickname" type="text" placeholder="1~15字符" maxlength="15" @input="handleNicknameInput" @compositionstart="handleCompositionStart" @compositionend="e => handleCompositionEnd(e, 'nickname')">
                  <span v-if="registerErrors.nickname" class="field-status field-status-error" :title="registerErrors.nickname">{{ registerErrors.nickname }}</span>
                </div>
              </div>
            </div>
            <div class="compact-form-row">
              <label>密码</label>
              <div class="compact-field">
                <div class="input-line-wrap">
                  <input v-model="registerForm.password" type="password" placeholder="8~15字符" minlength="8" maxlength="15" @input="handlePasswordInput" @compositionstart="handleCompositionStart" @compositionend="e => handleCompositionEnd(e, 'password')">
                  <span v-if="registerErrors.password" class="field-status field-status-error" :title="registerErrors.password">{{ registerErrors.password }}</span>
                </div>
              </div>
            </div>
            <div class="compact-form-row">
              <label>确认密码</label>
              <div class="compact-field">
                <div class="input-line-wrap">
                  <input v-model="registerForm.confirm_password" type="password" placeholder="再次输入密码" minlength="8" maxlength="15" @input="handleConfirmPasswordInput" @compositionstart="handleCompositionStart" @compositionend="e => handleCompositionEnd(e, 'confirm_password')">
                  <span v-if="registerErrors.confirm_password" class="field-status field-status-error" :title="registerErrors.confirm_password">{{ registerErrors.confirm_password }}</span>
                </div>
              </div>
            </div>
            <button type="button" class="btn-primary" @click="submitStep2" :disabled="loading">下一步</button>
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
            <div class="compact-form-row">
              <label>验证码</label>
              <div class="compact-field">
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
            <div class="compact-form-row">
              <label>邮箱</label>
              <div class="compact-field">
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
            </div>

            <div class="compact-form-row">
              <label>邮箱验证</label>
              <div class="compact-field">
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
        </div>

        <button type="button" class="btn-primary final-btn" @click="handleRegister" :disabled="loading || !isAllValid">
          {{ loading ? '注册中...' : '立即注册' }}
        </button>
        <p v-if="registerErrors.final" class="form-errors">{{ registerErrors.final }}</p>

      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { useAuth } from '../../composables/useAuth';

onMounted(() => document.body.classList.add('auth-page-active')); 
onBeforeUnmount(() => document.body.classList.remove('auth-page-active')); 

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
  emailSent,
  emailVerified,
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
  handleEmailEdit,
  sendEmailCode,
  verifyEmailCode,
  handleLogin,
  handleRegister
} = useAuth();
</script>

<style scoped> 
.auth-container { 
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 20px 0;
  overflow: hidden; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
} 

.auth-card { 
  background: var(--card-bg); 
  padding: 30px; 
  border-radius: 12px; 
  box-shadow: var(--card-shadow); 
  width: 100%; 
  max-width: 450px; 
  max-height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
} 

.auth-tabs { 
  display: flex; 
  border-bottom: 2px solid var(--border-color); 
  margin-bottom: 20px; 
  flex: 0 0 auto;
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

.auth-section {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 6px;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

/* Custom scrollbar for auth-section */
.auth-section::-webkit-scrollbar {
  width: 6px;
}
.auth-section::-webkit-scrollbar-track {
  background: transparent;
}
.auth-section::-webkit-scrollbar-thumb {
  background-color: var(--border-color);
  border-radius: 3px;
}

.form-group { 
  margin-bottom: 15px; 
} 

.form-group label { 
  display: block; 
  margin-bottom: 5px; 
  font-size: 0.9rem;
  font-weight: 600;
} 

.auth-card input { 
  width: 100%; 
  min-width: 0;
  border: none !important; 
  border-bottom: 2px solid var(--border-color) !important; 
  border-radius: 0 !important; 
  background: transparent !important; 
  padding: 9px 4px !important; 
  color: var(--text-color); 
  outline: none !important; 
  box-shadow: none !important; 
  appearance: none;
  transition: border-color 0.2s; 
} 

.auth-card input:focus { 
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

.auth-card input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-errors { 
  color: #e74c3c; 
  margin-top: 10px; 
  text-align: center; 
} 

.compact-form-row { 
  display: grid; 
  grid-template-columns: 72px minmax(0, 1fr); 
  gap: 12px; 
  align-items: start; 
  margin-bottom: 12px; 
} 

.compact-form-row > label { 
  margin-top: 10px; 
  font-weight: 600; 
  white-space: nowrap;
  font-size: 0.9rem;
} 

.compact-field { 
  min-width: 0; 
} 

.compact-field input, .compact-field .input-group-row { 
  width: 100%; 
} 

/* Responsive */
@media (max-width: 600px) {
  .field-status { 
    font-size: 0.72rem; 
  }

  .compact-form-row {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .compact-form-row > label {
    margin-top: 0;
  }
}
.register-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-box {
  border: 1px solid var(--border-color);
  border-radius: 8px;
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
  padding: 12px 15px;
  cursor: pointer;
  background: rgba(0,0,0,0.02);
}

.step-title {
  font-weight: bold;
  color: var(--text-color);
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
  font-size: 0.85rem;
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
  padding: 0 15px 15px 15px;
  border-top: 1px solid var(--border-color);
  margin-top: 5px;
  padding-top: 15px;
}

.input-group-row {
  display: flex;
  gap: 10px;
}

.btn-secondary {
  white-space: nowrap;
  padding: 0 15px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary:disabled {
  background: var(--border-color);
  color: var(--secondary-text);
  cursor: not-allowed;
}

.captcha-row {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.captcha-img {
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
}

.btn-text {
  background: none;
  border: none;
  color: var(--accent-color);
  cursor: pointer;
  padding: 0;
}

.inline-error {
  color: #e74c3c;
  font-size: 0.8rem;
  margin-top: 4px;
}

.inline-success {
  color: #2ecc71;
  font-size: 0.8rem;
  margin-top: 4px;
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
  border: none !important;
  border-bottom: none !important;
  outline: none !important;
  box-shadow: none !important;
} 

.field-status { 
  position: static; 
  width: auto;
  max-width: 96px; 
  font-size: 0.8rem; 
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
  height: 50px;
  font-size: 1.1rem;
  font-weight: bold;
  flex-shrink: 0;
}
</style>
