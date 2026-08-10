<template>
  <form class="resume-edit" @submit.prevent="submit">
    <section class="edit-section">
      <h2>{{ labels.personal }}</h2>
      <div class="field-grid">
        <label>
          <span>{{ labels.name }}</span>
          <input v-model="form.full_name" type="text" />
        </label>
        <label>
          <span>{{ labels.age }}</span>
          <input v-model="form.age" type="text" />
        </label>
        <label>
          <span>{{ labels.city }}</span>
          <input v-model="form.city" type="text" />
        </label>
        <label>
          <span>{{ labels.phone }}</span>
          <input v-model="form.phone" type="tel" />
        </label>
        <label>
          <span>{{ labels.email }}</span>
          <input v-model="form.email" type="email" />
        </label>
        <label>
          <span>{{ labels.photo }}</span>
          <input type="file" accept="image/*" @change="selectPhoto" />
        </label>
      </div>
      <label class="toggle-row">
        <input v-model="form.is_public" type="checkbox" />
        <span>{{ labels.publicResume }}</span>
      </label>
      <button v-if="form.photo && !selectedPhoto" type="button" class="ghost-btn" @click="removePhoto">
        <Trash2 :size="16" />
        <span>{{ labels.removePhoto }}</span>
      </button>
    </section>

    <section class="edit-section">
      <div class="section-head">
        <h2>{{ labels.education }}</h2>
        <button type="button" class="add-btn" @click="addEducation">
          <Plus :size="16" />
          <span>{{ labels.addEducation }}</span>
        </button>
      </div>
      <div v-for="(item, index) in form.educations" :key="item.local_id" class="edit-item">
        <div class="field-grid">
          <label>
            <span>{{ labels.startDate }}</span>
            <input v-model="item.start_date" type="text" placeholder="2024.9" />
          </label>
          <label>
            <span>{{ labels.endDate }}</span>
            <input v-model="item.end_date" type="text" :disabled="item.is_current" placeholder="2026.6" />
          </label>
          <label class="toggle-row inline-toggle">
            <input v-model="item.is_current" type="checkbox" />
            <span>{{ labels.current }}</span>
          </label>
          <label>
            <span>{{ labels.school }}</span>
            <input v-model="item.school" type="text" />
          </label>
          <label>
            <span>{{ labels.major }}</span>
            <input v-model="item.major" type="text" />
          </label>
          <label>
            <span>{{ labels.degree }}</span>
            <input v-model="item.degree" type="text" />
          </label>
        </div>
        <button type="button" class="delete-btn" @click="removeEducation(index)" :title="labels.delete">
          <Trash2 :size="16" />
        </button>
      </div>
    </section>

    <section class="edit-section">
      <div class="section-head">
        <h2>{{ labels.skills }}</h2>
        <button type="button" class="add-btn" @click="addSkillSection">
          <Plus :size="16" />
          <span>{{ labels.addSkill }}</span>
        </button>
      </div>
      <div v-for="(item, index) in form.skill_sections" :key="item.local_id" class="edit-item">
        <div class="item-delete-row">
          <button type="button" class="delete-btn" @click="removeSkillSection(index)" :title="labels.delete">
            <Trash2 :size="16" />
          </button>
        </div>
        <label>
          <span>{{ labels.skillTitle }}</span>
          <input v-model="item.title" type="text" />
        </label>
        <label>
          <span>{{ labels.skillDescription }}</span>
          <textarea v-model="item.description" rows="4"></textarea>
        </label>
      </div>
    </section>

    <section class="edit-section">
      <div class="section-head">
        <h2>{{ labels.projects }}</h2>
        <button type="button" class="add-btn" @click="addProject">
          <Plus :size="16" />
          <span>{{ labels.addProject }}</span>
        </button>
      </div>
      <div v-for="(item, index) in form.projects" :key="item.local_id" class="edit-item">
        <div class="field-grid">
          <label>
            <span>{{ labels.startDate }}</span>
            <input v-model="item.start_date" type="text" placeholder="2025.3" />
          </label>
          <label>
            <span>{{ labels.endDate }}</span>
            <input v-model="item.end_date" type="text" placeholder="2026.3" />
          </label>
          <label class="wide-field">
            <span>{{ labels.projectName }}</span>
            <input v-model="item.name" type="text" />
          </label>
          <label class="wide-field">
            <span>{{ labels.projectDescription }}</span>
            <textarea v-model="item.description" rows="4"></textarea>
          </label>
        </div>
        <button type="button" class="delete-btn" @click="removeProject(index)" :title="labels.delete">
          <Trash2 :size="16" />
        </button>
      </div>
    </section>

    <section class="edit-section">
      <div class="section-head">
        <h2>{{ labels.languages }}</h2>
        <button type="button" class="add-btn" @click="addLanguage">
          <Plus :size="16" />
          <span>{{ labels.addLanguage }}</span>
        </button>
      </div>
      <div v-for="(item, index) in form.languages" :key="item.local_id" class="compact-row">
        <input v-model="item.name" type="text" :placeholder="labels.languageName" />
        <input v-model="item.level" type="text" :placeholder="labels.level" />
        <button type="button" class="delete-btn" @click="removeLanguage(index)" :title="labels.delete">
          <Trash2 :size="16" />
        </button>
      </div>
    </section>

    <section class="edit-section">
      <div class="section-head">
        <h2>{{ labels.competitions }}</h2>
        <button type="button" class="add-btn" @click="addCompetition">
          <Plus :size="16" />
          <span>{{ labels.addCompetition }}</span>
        </button>
      </div>
      <div v-for="(item, index) in form.competitions" :key="item.local_id" class="edit-item">
        <div class="field-grid">
          <label>
            <span>{{ labels.date }}</span>
            <input v-model="item.date" type="text" placeholder="2025" />
          </label>
          <label class="wide-field">
            <span>{{ labels.competitionName }}</span>
            <input v-model="item.name" type="text" />
          </label>
          <label class="wide-field">
            <span>{{ labels.description }}</span>
            <textarea v-model="item.description" rows="2"></textarea>
          </label>
        </div>
        <button type="button" class="delete-btn" @click="removeCompetition(index)" :title="labels.delete">
          <Trash2 :size="16" />
        </button>
      </div>
    </section>

    <div class="edit-actions">
      <button type="button" class="ghost-btn" @click="$emit('cancel')">{{ labels.cancel }}</button>
      <button type="submit" class="save-btn" :disabled="saving">
        <Save :size="17" />
        <span>{{ saving ? labels.saving : labels.save }}</span>
      </button>
    </div>
  </form>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import { Plus, Save, Trash2 } from 'lucide-vue-next';

const props = defineProps({
  resume: { type: Object, required: true },
  labels: { type: Object, required: true },
  saving: { type: Boolean, default: false },
});

const emit = defineEmits(['save', 'cancel']);

const selectedPhoto = ref(null);
const shouldRemovePhoto = ref(false);
let localIdCounter = 0;
const makeLocalId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  localIdCounter += 1;
  return `resume-${Date.now()}-${localIdCounter}`;
};

const withLocalIds = (items) => (Array.isArray(items) ? items : []).map((item) => ({
  local_id: makeLocalId(),
  ...item,
}));

const form = reactive({});

const loadForm = () => {
  Object.assign(form, {
    full_name: props.resume.full_name || '',
    age: props.resume.age || '',
    city: props.resume.city || '',
    phone: props.resume.phone || '',
    email: props.resume.email || '',
    photo: props.resume.photo || '',
    educations: withLocalIds(props.resume.educations),
    skill_sections: withLocalIds(props.resume.skill_sections),
    projects: withLocalIds(props.resume.projects),
    languages: withLocalIds(props.resume.languages),
    competitions: withLocalIds(props.resume.competitions),
    extras: withLocalIds(props.resume.extras),
    is_public: props.resume.is_public !== false,
  });
  selectedPhoto.value = null;
  shouldRemovePhoto.value = false;
};

watch(() => props.resume, loadForm, { immediate: true, deep: true });

const cleanList = (items) => items.map(({ local_id, ...item }) => item);

const selectPhoto = (event) => {
  const file = event.target.files?.[0];
  selectedPhoto.value = file || null;
  shouldRemovePhoto.value = false;
};

const removePhoto = () => {
  form.photo = '';
  selectedPhoto.value = null;
  shouldRemovePhoto.value = true;
};

const addEducation = () => {
  form.educations.push({
    local_id: makeLocalId(),
    start_date: '',
    end_date: '',
    is_current: false,
    school: '',
    major: '',
    degree: '',
  });
};

const removeEducation = (index) => form.educations.splice(index, 1);

const addSkillSection = () => {
  form.skill_sections.push({
    local_id: makeLocalId(),
    id: makeLocalId(),
    title: '',
    description: '',
    order: form.skill_sections.length,
  });
};

const removeSkillSection = (index) => form.skill_sections.splice(index, 1);

const addProject = () => {
  form.projects.push({
    local_id: makeLocalId(),
    start_date: '',
    end_date: '',
    name: '',
    description: '',
  });
};

const removeProject = (index) => form.projects.splice(index, 1);

const addLanguage = () => {
  form.languages.push({ local_id: makeLocalId(), name: '', level: '' });
};

const removeLanguage = (index) => form.languages.splice(index, 1);

const addCompetition = () => {
  form.competitions.push({ local_id: makeLocalId(), date: '', name: '', description: '' });
};

const removeCompetition = (index) => form.competitions.splice(index, 1);

const submit = () => {
  emit('save', {
    data: {
      full_name: form.full_name,
      age: form.age,
      city: form.city,
      phone: form.phone,
      email: form.email,
      educations: cleanList(form.educations),
      skill_sections: cleanList(form.skill_sections).map((item, index) => ({
        ...item,
        order: index,
      })),
      projects: cleanList(form.projects),
      languages: cleanList(form.languages),
      competitions: cleanList(form.competitions),
      extras: cleanList(form.extras),
      is_public: form.is_public,
    },
    photo: selectedPhoto.value,
    removePhoto: shouldRemovePhoto.value,
  });
};
</script>

<style scoped>
.resume-edit {
  display: grid;
  gap: 22px;
  margin: 0 auto;
  padding: 28px;
  border: 1px solid rgba(203, 213, 225, 0.78);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.94);
  box-shadow: 0 18px 45px rgba(16, 32, 48, 0.1);
  padding-bottom: 112px;
}

.edit-section {
  display: grid;
  gap: 14px;
  padding-bottom: 22px;
  border-bottom: 1px solid #dde3ea;
}

.edit-section h2,
.section-head h2 {
  margin: 0;
  color: #153452;
  font-size: 18px;
  font-weight: 800;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

label {
  display: grid;
  gap: 6px;
  color: #425366;
  font-size: 13px;
  font-weight: 700;
}

input,
textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #1f2937;
  font: inherit;
  font-size: 14px;
  padding: 10px 11px;
}

textarea {
  resize: vertical;
  line-height: 1.55;
}

.wide-field {
  grid-column: 1 / -1;
}

.toggle-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
}

.toggle-row input {
  width: auto;
}

.inline-toggle {
  align-self: end;
  min-height: 42px;
}

.edit-item {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid #e1e7ef;
  border-radius: 8px;
  background: #f8fafc;
}

.compact-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 48px;
  gap: 10px;
  align-items: center;
}

.item-delete-row {
  display: flex;
  justify-content: flex-end;
}

button {
  border: 0;
  font: inherit;
}

.add-btn,
.save-btn,
.ghost-btn,
.delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 800;
}

.add-btn,
.save-btn,
.ghost-btn {
  min-height: 38px;
}

.add-btn,
.save-btn {
  padding: 0 14px;
  background: #153452;
  color: #fff;
}

.ghost-btn {
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #25364a;
}

.ghost-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed !important;
}

.delete-btn {
  width: 48px;
  height: 48px;
  min-width: 48px;
  background: #fff1f2;
  color: #be123c;
}

.edit-item > .delete-btn {
  justify-self: end;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.save-btn:disabled {
  opacity: 0.65;
}

@media (max-width: 720px) {
  .resume-edit {
    padding: 20px 14px 96px;
    border-right: 0;
    border-left: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .field-grid,
  .compact-row {
    grid-template-columns: 1fr;
  }

  .compact-row .delete-btn {
    justify-self: end;
  }

  .section-head,
  .edit-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
