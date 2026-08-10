<template>
  <main class="resume-route">
    <div v-if="loading" class="resume-state">
      <Loader2 class="spin" :size="28" />
      <span>{{ t.loading }}</span>
    </div>

    <div v-else-if="error" class="resume-state error">
      <h1>{{ t.notFound }}</h1>
      <p>{{ t.notFoundDetail }}</p>
    </div>

    <div v-else class="resume-shell">
      <aside class="resume-side-toolbar no-print">
        <div class="lang-tabs" :aria-label="t.language">
          <router-link
            v-for="option in langOptions"
            :key="option"
            :to="`/@${username}/cv/${option}`"
            :class="{ active: lang === option }"
          >
            {{ langDisplay[option] }}
          </router-link>
        </div>
        <div class="toolbar-actions">
          <button
            v-if="editing"
            type="button"
            class="toolbar-btn"
            :title="t.back"
            :aria-label="t.back"
            @click="editing = false"
          >
            <ArrowLeft :size="20" />
          </button>
          <button
            v-if="resume.can_edit && !editing"
            type="button"
            class="toolbar-btn"
            :title="t.edit"
            :aria-label="t.edit"
            @click="editing = true"
          >
            <Pencil :size="20" />
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'pdf-unavailable': !currentPdfAvailable }"
            :title="currentPdfAvailable ? 'PDF' : t.noPdf"
            :aria-label="currentPdfAvailable ? 'PDF' : t.noPdf"
            :disabled="!currentPdfAvailable"
            @click="downloadPdf"
          >
            <Download :size="20" />
            <span v-if="currentPdfAvailable" class="pdf-check-badge" aria-hidden="true">
              <Check :size="11" />
            </span>
          </button>
          <button
            v-if="resume.can_edit"
            type="button"
            class="toolbar-btn"
            :title="t.uploadPdf"
            :aria-label="t.uploadPdf"
            :disabled="pdfBusy === lang"
            @click="openToolbarPdfUpload"
          >
            <Loader2 v-if="pdfBusy === lang" class="spin" :size="20" />
            <Upload v-else :size="20" />
          </button>
          <input
            v-if="resume.can_edit"
            ref="toolbarPdfInput"
            class="toolbar-file-input"
            type="file"
            accept=".pdf,application/pdf"
            @change="handleToolbarPdfSelected"
          />
        </div>
      </aside>

      <p v-if="saveError || pdfError" class="save-error no-print">{{ saveError || pdfError }}</p>

      <ResumeEdit
        v-if="editing"
        :resume="resume"
        :labels="t"
        :saving="saving"
        @save="saveResume"
        @cancel="editing = false"
      />

      <article v-else class="resume-paper">
        <header class="resume-head">
          <h1>{{ t.title }}</h1>
          <div class="head-dots" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </header>
        <div class="stripe-row" aria-hidden="true">
          <span class="stripe-blue"></span>
          <span class="stripe-gold"></span>
        </div>

        <section class="resume-section personal-section">
          <SectionLabel :text="t.personal" />
          <div class="personal-grid">
            <dl class="personal-list">
              <div>
                <dt>{{ t.name }}</dt>
                <dd>{{ valueOrDash(resume.full_name) }}</dd>
              </div>
              <div>
                <dt>{{ t.age }}</dt>
                <dd>{{ valueOrDash(resume.age) }}</dd>
              </div>
              <div>
                <dt>{{ t.city }}</dt>
                <dd>{{ valueOrDash(resume.city) }}</dd>
              </div>
              <div>
                <dt>{{ t.phone }}</dt>
                <dd>{{ valueOrDash(resume.phone) }}</dd>
              </div>
              <div>
                <dt>{{ t.email }}</dt>
                <dd>{{ valueOrDash(resume.email) }}</dd>
              </div>
            </dl>
            <div class="photo-box">
              <img v-if="resume.photo" :src="resume.photo" :alt="t.photo" />
              <span v-else>{{ initials }}</span>
            </div>
          </div>
        </section>

        <section class="resume-section">
          <SectionLabel :text="t.education" />
          <div class="timeline-list">
            <div v-for="item in sortedEducations" :key="itemKey(item)" class="timeline-item">
              <div class="date-range">{{ dateRange(item) }}</div>
              <div class="item-body">
                <strong>{{ compactJoin([item.school, item.major, item.degree]) || t.empty }}</strong>
              </div>
            </div>
            <p v-if="!sortedEducations.length" class="empty-line">{{ t.empty }}</p>
          </div>
        </section>

        <section class="resume-section">
          <SectionLabel :text="t.skills" />
          <div class="skill-blocks">
            <div v-for="item in sortedSkillSections" :key="item.id || itemKey(item)" class="skill-block">
              <h3>{{ item.title || t.skillTitle }}</h3>
              <p>{{ valueOrDash(item.description) }}</p>
            </div>
            <p v-if="!sortedSkillSections.length" class="empty-line">{{ t.empty }}</p>
          </div>
        </section>

        <section class="resume-section">
          <SectionLabel :text="t.projects" />
          <div class="project-list">
            <article v-for="item in sortedProjects" :key="itemKey(item)" class="project-item">
              <h3>
                <span>{{ dateRange(item) }}</span>
                {{ item.name || t.projectName }}
              </h3>
              <p>{{ valueOrDash(item.description) }}</p>
            </article>
            <p v-if="!sortedProjects.length" class="empty-line">{{ t.empty }}</p>
          </div>
        </section>

        <section class="resume-section">
          <SectionLabel :text="t.additional" />
          <div class="additional-grid">
            <div>
              <h3>{{ t.languages }}</h3>
              <p v-if="resume.languages?.length">
                {{ resume.languages.map((item) => compactJoin([item.name, item.level])).filter(Boolean).join(', ') }}
              </p>
              <p v-else>{{ t.empty }}</p>
            </div>
            <div>
              <h3>{{ t.competitions }}</h3>
              <ul v-if="resume.competitions?.length">
                <li v-for="item in resume.competitions" :key="itemKey(item)">
                  {{ compactJoin([item.date, item.name, item.description]) }}
                </li>
              </ul>
              <p v-else>{{ t.empty }}</p>
            </div>
          </div>
        </section>
      </article>
    </div>
  </main>
</template>

<script setup>
import { computed, h, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft, Check, Download, Loader2, Pencil, Upload } from 'lucide-vue-next';
import api, { getCsrfToken } from '../api';
import ResumeEdit from '../components/resume/ResumeEdit.vue';

const SectionLabel = (props) => h('div', { class: 'section-label' }, props.text);
SectionLabel.props = { text: String };

const route = useRoute();
const langOptions = ['zh', 'de', 'en'];
const langDisplay = {
  zh: '中',
  de: 'DE',
  en: 'EN',
};

const labels = {
  zh: {
    title: '简历',
    loading: '正在加载...',
    notFound: '简历不可访问',
    notFoundDetail: '该用户不存在，或简历未公开。',
    language: '语言',
    edit: '编辑',
    back: '返回',
    saveFailed: '保存失败，请稍后再试。',
    pdfManager: 'PDF 简历',
    uploadPdf: '选择 PDF',
    replacePdf: '替换',
    deletePdf: '删除',
    uploadedPdf: '已上传',
    missingPdf: '未上传',
    pdfUploadFailed: 'PDF 上传失败',
    pdfDeleteFailed: 'PDF 删除失败',
    noPdf: '暂无当前语言 PDF',
    save: '保存',
    saving: '保存中...',
    cancel: '取消',
    empty: '暂无',
    delete: '删除',
    personal: '个人信息',
    name: '姓名',
    age: '年龄',
    city: '城市',
    phone: '电话',
    email: '邮箱',
    photo: '证件照',
    publicResume: '公开简历',
    removePhoto: '移除证件照',
    education: '教育背景',
    addEducation: '添加教育经历',
    startDate: '开始时间',
    endDate: '结束时间',
    current: '至今',
    school: '学校',
    major: '专业',
    degree: '学位',
    skills: '技术知识与工具',
    addSkill: '添加内容',
    skillTitle: '标题',
    skillDescription: '内容',
    projects: '项目经历',
    addProject: '添加项目',
    projectName: '项目名称',
    projectDescription: '项目描述',
    additional: '附加信息',
    languages: '语言',
    addLanguage: '添加语言',
    languageName: '语言名称',
    level: '水平',
    competitions: '竞赛',
    addCompetition: '添加竞赛',
    date: '时间',
    competitionName: '竞赛名称',
    description: '补充信息',
  },
  de: {
    title: 'Lebenslauf',
    loading: 'Wird geladen...',
    notFound: 'Lebenslauf nicht erreichbar',
    notFoundDetail: 'Der Benutzer existiert nicht oder der Lebenslauf ist privat.',
    language: 'Sprache',
    edit: 'Bearbeiten',
    back: 'Zuruck',
    saveFailed: 'Speichern fehlgeschlagen. Bitte versuche es erneut.',
    pdfManager: 'PDF-Lebenslauf',
    uploadPdf: 'PDF auswahlen',
    replacePdf: 'Ersetzen',
    deletePdf: 'Loschen',
    uploadedPdf: 'Hochgeladen',
    missingPdf: 'Nicht hochgeladen',
    pdfUploadFailed: 'PDF-Upload fehlgeschlagen',
    pdfDeleteFailed: 'PDF konnte nicht geloscht werden',
    noPdf: 'Keine PDF-Datei vorhanden',
    save: 'Speichern',
    saving: 'Speichert...',
    cancel: 'Abbrechen',
    empty: 'Keine Angaben',
    delete: 'Loschen',
    personal: 'Personliche Daten',
    name: 'Name',
    age: 'Alter',
    city: 'Stadt',
    phone: 'Telefon',
    email: 'E-Mail',
    photo: 'Foto',
    publicResume: 'Lebenslauf offentlich',
    removePhoto: 'Foto entfernen',
    education: 'Ausbildung',
    addEducation: 'Ausbildung hinzufugen',
    startDate: 'Beginn',
    endDate: 'Ende',
    current: 'Heute',
    school: 'Hochschule',
    major: 'Fachrichtung',
    degree: 'Abschluss',
    skills: 'Technische Kenntnisse und Tools',
    addSkill: 'Inhalt hinzufugen',
    skillTitle: 'Titel',
    skillDescription: 'Inhalt',
    projects: 'Projekterfahrung',
    addProject: 'Projekt hinzufugen',
    projectName: 'Projektname',
    projectDescription: 'Projektbeschreibung',
    additional: 'Zusatzinformationen',
    languages: 'Sprachen',
    addLanguage: 'Sprache hinzufugen',
    languageName: 'Sprache',
    level: 'Niveau',
    competitions: 'Wettbewerbe',
    addCompetition: 'Wettbewerb hinzufugen',
    date: 'Zeit',
    competitionName: 'Name',
    description: 'Erganzung',
  },
  en: {
    title: 'Resume',
    loading: 'Loading...',
    notFound: 'Resume unavailable',
    notFoundDetail: 'This user does not exist, or the resume is private.',
    language: 'Language',
    edit: 'Edit',
    back: 'Back',
    saveFailed: 'Save failed. Please try again.',
    pdfManager: 'PDF Resume',
    uploadPdf: 'Choose PDF',
    replacePdf: 'Replace',
    deletePdf: 'Delete',
    uploadedPdf: 'Uploaded',
    missingPdf: 'Not uploaded',
    pdfUploadFailed: 'PDF upload failed',
    pdfDeleteFailed: 'PDF delete failed',
    noPdf: 'No PDF available',
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    empty: 'Not provided',
    delete: 'Delete',
    personal: 'Personal Information',
    name: 'Name',
    age: 'Age',
    city: 'City',
    phone: 'Phone',
    email: 'Email',
    photo: 'Photo',
    publicResume: 'Public resume',
    removePhoto: 'Remove photo',
    education: 'Education',
    addEducation: 'Add Education',
    startDate: 'Start',
    endDate: 'End',
    current: 'Present',
    school: 'School',
    major: 'Major',
    degree: 'Degree',
    skills: 'Technical Knowledge and Tools',
    addSkill: 'Add Content',
    skillTitle: 'Title',
    skillDescription: 'Content',
    projects: 'Projects',
    addProject: 'Add Project',
    projectName: 'Project Name',
    projectDescription: 'Project Description',
    additional: 'Additional Information',
    languages: 'Languages',
    addLanguage: 'Add Language',
    languageName: 'Language',
    level: 'Level',
    competitions: 'Competitions',
    addCompetition: 'Add Competition',
    date: 'Date',
    competitionName: 'Competition Name',
    description: 'Details',
  },
};

const resume = ref({});
const loading = ref(true);
const saving = ref(false);
const error = ref(false);
const editing = ref(false);
const saveError = ref('');
const pdfBusy = ref('');
const pdfError = ref('');
const toolbarPdfInput = ref(null);

const username = computed(() => route.params.username);
const lang = computed(() => (langOptions.includes(route.params.lang) ? route.params.lang : 'zh'));
const t = computed(() => labels[lang.value]);

const parseDateScore = (value, present = false) => {
  if (present) return 999999;
  const text = String(value || '');
  const match = text.match(/(\d{4})(?:[.\-/年\s]*(\d{1,2}))?/);
  if (!match) return 0;
  return Number(match[1]) * 100 + Number(match[2] || 12);
};

const sortedByDate = (items, currentResolver = () => false) => [...(items || [])].sort((a, b) => {
  const bScore = parseDateScore(b.end_date || b.date || b.start_date, currentResolver(b));
  const aScore = parseDateScore(a.end_date || a.date || a.start_date, currentResolver(a));
  return bScore - aScore;
});

const sortedEducations = computed(() => sortedByDate(resume.value.educations, (item) => item.is_current));
const sortedProjects = computed(() => sortedByDate(resume.value.projects));
const sortedSkillSections = computed(() => [...(resume.value.skill_sections || [])].sort((a, b) => {
  return Number(a.order || 0) - Number(b.order || 0);
}));
const currentPdfAvailable = computed(() => {
  return Boolean(resume.value.pdfs?.[lang.value]?.available);
});

const initials = computed(() => {
  const name = resume.value.full_name || resume.value.username || '?';
  return String(name).trim().slice(0, 2).toUpperCase();
});

const compactJoin = (parts) => parts.map((part) => String(part || '').trim()).filter(Boolean).join(' ');
const valueOrDash = (value) => String(value || '').trim() || t.value.empty;
const dateRange = (item) => {
  const start = String(item.start_date || '').trim();
  const end = String(item.is_current ? t.value.current : item.end_date || '').trim();
  if (start && end) return `${start} - ${end}`;
  return start || end || t.value.empty;
};
const itemKey = (item) => JSON.stringify(item);

const fetchResume = async () => {
  loading.value = true;
  error.value = false;
  editing.value = false;
  try {
    const response = await api.get(`/resumes/${username.value}/`, { params: { lang: lang.value } });
    resume.value = response.data;
  } catch (err) {
    error.value = true;
  } finally {
    loading.value = false;
  }
};

const saveResume = async ({ data, photo, removePhoto }) => {
  saving.value = true;
  saveError.value = '';
  try {
    await getCsrfToken();
    const body = new FormData();
    body.append('payload', JSON.stringify(data));
    if (photo) body.append('photo', photo);
    if (removePhoto) body.append('remove_photo', 'true');
    const response = await api.put(`/resumes/${username.value}/`, body, { params: { lang: lang.value } });
    resume.value = response.data;
    editing.value = false;
  } catch (err) {
    console.error('Resume save failed:', err.response?.data || err);
    saveError.value = err.response?.data?.detail || t.value.saveFailed;
  } finally {
    saving.value = false;
  }
};

const downloadPdf = () => {
  if (!currentPdfAvailable.value) return;
  window.location.href = `/api/resumes/${username.value}/pdf/?lang=${lang.value}`;
};

const openToolbarPdfUpload = () => {
  toolbarPdfInput.value?.click();
};

const handleToolbarPdfSelected = (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  uploadPdf({ language: lang.value, file });
};

const mergePdfStatus = (pdfs) => {
  resume.value = {
    ...resume.value,
    pdfs: pdfs || resume.value.pdfs || {},
  };
};

const uploadPdf = async ({ language, file }) => {
  pdfBusy.value = language;
  pdfError.value = '';
  try {
    await getCsrfToken();
    const body = new FormData();
    body.append('file', file);
    const response = await api.put(`/resumes/${username.value}/pdf/`, body, { params: { lang: language } });
    mergePdfStatus(response.data.pdfs);
  } catch (err) {
    console.error('Resume PDF upload failed:', err.response?.data || err);
    pdfError.value = err.response?.data?.detail || t.value.pdfUploadFailed;
  } finally {
    pdfBusy.value = '';
  }
};

const deletePdf = async (language) => {
  pdfBusy.value = language;
  pdfError.value = '';
  try {
    await getCsrfToken();
    const response = await api.delete(`/resumes/${username.value}/pdf/`, { params: { lang: language } });
    mergePdfStatus(response.data.pdfs);
  } catch (err) {
    console.error('Resume PDF delete failed:', err.response?.data || err);
    pdfError.value = err.response?.data?.detail || t.value.pdfDeleteFailed;
  } finally {
    pdfBusy.value = '';
  }
};

onMounted(fetchResume);
watch(() => [route.params.username, route.params.lang], fetchResume);
</script>

<style scoped>
.resume-route {
  min-height: 100vh;
  height: auto;
  overflow: visible;
  padding: 0 18px 56px;
  background: transparent;
}

.resume-shell {
  position: relative;
  width: min(960px, 100%);
  margin: 0 auto;
}

.resume-side-toolbar {
  position: fixed;
  top: calc(var(--navbar-height, 80px) + 16px);
  left: max(16px, calc(50% - 480px - 64px));
  width: 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 20;
}

.lang-tabs,
.toolbar-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
}

.lang-tabs a,
.toolbar-btn {
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #243449;
  text-decoration: none;
  font-size: 14px;
  font-weight: 800;
  padding: 0;
  white-space: nowrap;
}

.toolbar-btn {
  appearance: none;
  position: relative;
}

.toolbar-btn:disabled {
  pointer-events: auto;
}

.toolbar-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.toolbar-btn.pdf-unavailable {
  opacity: 0.45;
  cursor: not-allowed !important;
}

.pdf-check-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: #22c55e;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
}

.lang-tabs a.active,
.toolbar-btn:hover {
  background: #153452;
  border-color: #153452;
  color: #fff;
}

.resume-paper {
  position: relative;
  overflow: hidden;
  padding: 46px 54px 54px 72px;
  background: #fff;
  color: #444;
  box-shadow: 0 18px 45px rgba(16, 32, 48, 0.12);
}

.save-error {
  margin: 0 0 12px;
  padding: 10px 12px;
  border: 1px solid #fecdd3;
  border-radius: 6px;
  background: #fff1f2;
  color: #be123c;
  font-size: 14px;
  font-weight: 800;
}

.resume-paper::before {
  content: "";
  position: absolute;
  top: 126px;
  bottom: 42px;
  left: 56px;
  width: 2px;
  background: #153452;
}

.resume-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 22px;
}

.resume-head h1 {
  margin: 0;
  color: #153452;
  font-size: 40px;
  font-weight: 700;
  letter-spacing: 8px;
}

.head-dots {
  display: flex;
  gap: 16px;
}

.head-dots span {
  width: 29px;
  height: 29px;
  border-radius: 999px;
  background: #c79d00;
  box-shadow: inset 9px 8px 0 rgba(255, 255, 255, 0.9);
}

.stripe-row {
  display: grid;
  grid-template-columns: 1fr 0.72fr;
  gap: 8px;
  margin: 0 -54px 22px -72px;
}

.stripe-row span {
  height: 19px;
}

.stripe-blue {
  background: #153452;
}

.stripe-gold {
  background: #c79d00;
}

.resume-section {
  position: relative;
  margin-top: 26px;
  padding-left: 26px;
  border-top: 1px solid #d7dce2;
}

.personal-section {
  margin-top: 8px;
}

:deep(.section-label) {
  display: inline-flex;
  align-items: center;
  min-width: 142px;
  height: 26px;
  margin: -13px 0 14px -42px;
  padding: 0 16px;
  background: #153452;
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  clip-path: polygon(0 0, 100% 0, 95% 100%, 0 100%);
}

.personal-grid {
  display: grid;
  grid-template-columns: 1fr 150px;
  gap: 34px;
  align-items: start;
}

.personal-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 34px;
  margin: 0;
}

.personal-list div {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
}

dt {
  color: #555;
  font-weight: 700;
}

dd {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.photo-box {
  width: 116px;
  aspect-ratio: 3 / 4;
  justify-self: center;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #eef2f6;
  color: #153452;
  font-size: 28px;
  font-weight: 800;
}

.photo-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.timeline-list,
.project-list,
.skill-blocks,
.additional-grid {
  display: grid;
  gap: 17px;
}

.timeline-item {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  gap: 10px;
}

.date-range,
.project-item h3 span {
  color: #444;
  font-weight: 900;
}

.item-body strong,
.project-item h3 {
  color: #3d3f43;
  font-size: 17px;
  font-weight: 900;
}

.skill-blocks h3,
.additional-grid h3 {
  margin: 0 0 4px;
  color: #3d3f43;
  font-size: 16px;
  font-weight: 900;
}

.skill-blocks p,
.project-item p,
.additional-grid p,
.additional-grid li {
  margin: 0;
  color: #4b5563;
  line-height: 1.55;
  white-space: pre-line;
}

.project-item h3 {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0 0 8px;
}

.additional-grid {
  grid-template-columns: 1fr;
}

.additional-grid ul {
  display: grid;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.empty-line {
  margin: 0;
  color: #64748b;
}

.resume-state {
  min-height: 50vh;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  color: #41546a;
}

.resume-state h1 {
  margin: 0;
  color: #153452;
  font-size: 28px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 720px) {
  .resume-route {
    padding: 0 0 32px;
    background: transparent;
  }

  .resume-side-toolbar {
    position: sticky;
    top: 0;
    left: auto;
    z-index: 20;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: auto;
    padding: 10px;
    margin: 0;
    background: rgba(255, 255, 255, 0.95);
    border-bottom: 1px solid #e2e8f0;
  }

  .lang-tabs,
  .toolbar-actions {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
  }

  .resume-paper {
    padding: 30px 22px 38px 34px;
    box-shadow: none;
  }

  .resume-paper::before {
    left: 20px;
    top: 104px;
  }

  .resume-head h1 {
    font-size: 32px;
    letter-spacing: 4px;
  }

  .head-dots {
    gap: 8px;
  }

  .head-dots span {
    width: 22px;
    height: 22px;
  }

  .stripe-row {
    margin: 0 -22px 22px -34px;
  }

  :deep(.section-label) {
    min-width: 120px;
    margin-left: -26px;
  }

  .personal-grid,
  .personal-list,
  .timeline-item {
    grid-template-columns: 1fr;
  }

  .photo-box {
    justify-self: start;
    order: -1;
  }

  .toolbar-actions {
    justify-content: flex-end;
  }
}

@media print {
  .resume-route {
    padding: 0;
    background: #fff;
  }

  .no-print {
    display: none !important;
  }

  .resume-shell {
    width: 100%;
  }

  .resume-paper {
    box-shadow: none;
    padding: 34px 42px 42px 58px;
  }
}
</style>
