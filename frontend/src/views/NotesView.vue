<template>
  <main class="notes-page" :style="notebookVars">
    <section class="notebook-stage" aria-label="笔记本">
      <div class="page-fill left-page-fill"></div>
      <div class="page-fill right-page-fill"></div>

      <aside class="notebook-left-page">
        <div class="mode-list">
          <button
            v-for="mode in modes"
            :key="mode.id"
            type="button"
            class="mode-btn"
            :class="{ active: activeMode === mode.id }"
            @click="setMode(mode.id)"
          >
            <span class="mode-icon">{{ mode.icon }}</span>
            <span>{{ mode.label }}</span>
          </button>
        </div>

        <div class="quick-panel">
          <div class="quick-title">{{ activeModeLabel }}</div>
          <div class="quick-meta">{{ quickMeta }}</div>
        </div>
      </aside>

      <section class="notebook-right-page">
        <div v-if="activeMode === 'sticky'" class="content-view sticky-view">
          <template v-if="selectedSticky && stickyDetailMode">
            <header class="content-toolbar sticky-detail-toolbar">
              <button type="button" class="back-btn" @click="closeStickyDetail">返回</button>
              <div class="sticky-detail-title">
                <span>{{ stickyDetailMode === 'edit' ? '编辑便签' : '查看便签' }}</span>
                <small>{{ selectedSticky.text.length }}/500</small>
              </div>
              <button
                v-if="stickyDetailMode === 'view'"
                type="button"
                class="toolbar-icon-btn"
                aria-label="编辑便签"
                title="编辑"
                @click="openStickyDetail(selectedSticky, 'edit')"
              >
                <Pencil :size="18" />
              </button>
            </header>

            <div v-if="stickyDetailMode === 'edit'" class="sticky-editor" :style="stickyCardStyle(selectedSticky)">
              <div class="lined-textarea-shell">
                <div class="generated-lines" aria-hidden="true">
                  <span
                    v-for="line in editorLineCount(selectedSticky)"
                    :key="line"
                    :style="{ top: `calc(${line} * var(--sticky-editor-line-height) + var(--sticky-editor-line-offset))` }"
                  ></span>
                </div>
                <textarea
                  v-model="selectedSticky.text"
                  class="sticky-editor-textarea"
                  maxlength="500"
                  placeholder="写点什么"
                ></textarea>
              </div>

              <div class="sticky-editor-panel">
                <label class="field-label">
                  <span>标签</span>
                  <select v-model="selectedSticky.tagId" @change="syncStickyTagColor(selectedSticky)">
                    <option v-for="tag in selectableTags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
                  </select>
                </label>

                <div class="field-label">
                  <span>标签颜色</span>
                  <div class="color-row" aria-label="选择标签颜色">
                    <button
                      v-for="color in tagColorOptions"
                      :key="color"
                      type="button"
                      class="color-swatch"
                      :class="{ active: selectedSticky.color === color }"
                      :style="{ backgroundColor: color }"
                      :aria-label="`选择颜色 ${color}`"
                      @click="setStickyColor(selectedSticky, color)"
                    ></button>
                    <label class="custom-color">
                      <input v-model="selectedSticky.color" type="color" />
                      <span>自定义</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <article v-else class="sticky-reader" :style="stickyCardStyle(selectedSticky)">
              <div class="sticky-reader-tag">
                <span class="tag-dot" :style="{ backgroundColor: selectedSticky.color }"></span>
                {{ stickyTagName(selectedSticky) }}
              </div>
              <p>{{ selectedSticky.text || '还没有内容' }}</p>
            </article>
          </template>

          <template v-else>
            <header class="content-toolbar">
              <h1>便签</h1>
              <button type="button" @click="addSticky">新增</button>
            </header>
            <div class="sticky-grid">
              <article
                v-for="note in stickyNotes"
                :key="note.id"
                class="sticky-card"
                :style="stickyCardStyle(note)"
              >
                <div class="sticky-card-actions" aria-label="便签操作">
                  <button
                    type="button"
                    class="circle-action"
                    aria-label="查看便签"
                    title="查看"
                    @click="openStickyDetail(note, 'view')"
                  >
                    <Eye :size="16" />
                  </button>
                  <button
                    type="button"
                    class="circle-action"
                    aria-label="编辑便签"
                    title="编辑"
                    @click="openStickyDetail(note, 'edit')"
                  >
                    <Pencil :size="16" />
                  </button>
                  <button
                    type="button"
                    class="circle-action delete-action"
                    aria-label="删除便签"
                    title="删除"
                    @click="removeSticky(note.id)"
                  >
                    <X :size="18" />
                  </button>
                </div>
                <div class="sticky-tag">
                  <span class="tag-dot" :style="{ backgroundColor: note.color }"></span>
                  {{ stickyTagName(note) }}
                </div>
                <p class="sticky-preview">{{ note.text || '写点什么' }}</p>
              </article>
            </div>
          </template>
        </div>

        <div v-else-if="activeMode === 'note'" class="content-view sticky-view">
          <template v-if="selectedNote && noteDetailMode">
            <header class="content-toolbar sticky-detail-toolbar">
              <button type="button" class="back-btn" @click="closeNoteDetail">返回</button>
              <div class="sticky-detail-title">
                <span>{{ noteDetailMode === 'edit' ? '编辑笔记' : '查看笔记' }}</span>
                <small>{{ selectedNote.text.length }}/500</small>
              </div>
              <button
                v-if="noteDetailMode === 'view'"
                type="button"
                class="toolbar-icon-btn"
                aria-label="编辑笔记"
                title="编辑"
                @click="openNoteDetail(selectedNote, 'edit')"
              >
                <Pencil :size="18" />
              </button>
            </header>

            <div v-if="noteDetailMode === 'edit'" class="sticky-editor" :style="noteCardStyle(selectedNote)">
              <div class="lined-textarea-shell">
                <div class="generated-lines" aria-hidden="true">
                  <span
                    v-for="line in editorLineCount(selectedNote)"
                    :key="line"
                    :style="{ top: `calc(${line} * var(--sticky-editor-line-height) + var(--sticky-editor-line-offset))` }"
                  ></span>
                </div>
                <textarea
                  v-model="selectedNote.text"
                  class="sticky-editor-textarea"
                  maxlength="500"
                  placeholder="写点什么"
                ></textarea>
              </div>

              <div class="sticky-editor-panel">
                <label class="field-label">
                  <span>标签</span>
                  <select v-model="selectedNote.tagId" @change="syncNoteTagColor(selectedNote)">
                    <option v-for="tag in selectableTags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
                  </select>
                </label>

                <div class="field-label">
                  <span>标签颜色</span>
                  <div class="color-row" aria-label="选择标签颜色">
                    <button
                      v-for="color in tagColorOptions"
                      :key="color"
                      type="button"
                      class="color-swatch"
                      :class="{ active: selectedNote.color === color }"
                      :style="{ backgroundColor: color }"
                      :aria-label="`选择颜色 ${color}`"
                      @click="setNoteColor(selectedNote, color)"
                    ></button>
                    <label class="custom-color">
                      <input v-model="selectedNote.color" type="color" />
                      <span>自定义</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <article v-else class="sticky-reader" :style="noteCardStyle(selectedNote)">
              <div class="sticky-reader-tag">
                <span class="tag-dot" :style="{ backgroundColor: selectedNote.color }"></span>
                {{ noteTagName(selectedNote) }}
              </div>
              <p>{{ selectedNote.text || '还没有内容' }}</p>
            </article>
          </template>

          <template v-else>
            <header class="content-toolbar">
              <h1>笔记</h1>
              <button type="button" @click="addNote">新增</button>
            </header>
            <div class="sticky-grid">
              <article
                v-for="note in noteNotes"
                :key="note.id"
                class="sticky-card"
                :style="noteCardStyle(note)"
              >
                <div class="sticky-card-actions" aria-label="笔记操作">
                  <button
                    type="button"
                    class="circle-action"
                    aria-label="查看笔记"
                    title="查看"
                    @click="openNoteDetail(note, 'view')"
                  >
                    <Eye :size="16" />
                  </button>
                  <button
                    type="button"
                    class="circle-action"
                    aria-label="编辑笔记"
                    title="编辑"
                    @click="openNoteDetail(note, 'edit')"
                  >
                    <Pencil :size="16" />
                  </button>
                  <button
                    type="button"
                    class="circle-action delete-action"
                    aria-label="删除笔记"
                    title="删除"
                    @click="removeNote(note.id)"
                  >
                    <X :size="18" />
                  </button>
                </div>
                <div class="sticky-tag">
                  <span class="tag-dot" :style="{ backgroundColor: note.color }"></span>
                  {{ noteTagName(note) }}
                </div>
                <p class="sticky-preview">{{ note.text || '写点什么' }}</p>
              </article>
            </div>
          </template>
        </div>

        <div v-else-if="activeMode === 'diary'" class="content-view diary-view">
          <header class="content-toolbar diary-toolbar">
            <h1>日记</h1>
            <p class="diary-hint">点击年份或月份选择时间，日历滚动切月，年份可横向滑动。</p>
            <div class="diary-actions">
              <button type="button" class="locate-time-btn" @click="locateToday">
                <LocateFixed :size="18" />
                定位时间
              </button>
              <button type="button" class="time-machine-btn" @click="showDiaryCalendar = !showDiaryCalendar">
                <Clock3 :size="18" />
                时间机器
              </button>
            </div>
          </header>

          <div v-if="showDiaryCalendar" class="diary-calendar" @wheel.prevent="handleDiaryWheel">
            <div class="calendar-top">
              <button type="button" class="circle-action" aria-label="上一个时间段" @click="shiftDiaryTime(-1)">
                <ChevronLeft :size="18" />
              </button>
              <div class="calendar-title">
                <div class="time-block-row">
                  <button
                    type="button"
                    class="time-block split-year-block"
                    :class="{ marked: hasDiaryInCentury(diaryCenturyPrefix) }"
                    @click="diaryPickerMode = 'century'"
                  >
                    {{ diaryCenturyPrefix }}
                  </button>
                  <button
                    type="button"
                    class="time-block split-year-block"
                    :class="{ marked: hasDiaryInYear(diaryCalendarYear) }"
                    @click="diaryPickerMode = 'year'"
                  >
                    {{ diaryYearSuffix }}
                  </button>
                  <span class="time-unit">年</span>
                  <button
                    type="button"
                    class="time-block month-block"
                    :class="{ marked: hasDiaryInMonth(diaryCalendarYear, diaryCalendarMonth) }"
                    @click="diaryPickerMode = 'month'"
                  >
                    {{ diaryCalendarMonth + 1 }}
                  </button>
                  <span class="time-unit">月</span>
                </div>
                <span>{{ calendarSubtitle }}</span>
              </div>
              <button type="button" class="circle-action" aria-label="下一个时间段" @click="shiftDiaryTime(1)">
                <ChevronRight :size="18" />
              </button>
            </div>
            <template v-if="diaryPickerMode === 'date'">
              <div class="calendar-weekdays">
                <span v-for="day in weekdayLabels" :key="day">{{ day }}</span>
              </div>
              <div class="calendar-grid" :key="calendarMotionKey">
                <button
                  v-for="day in diaryCalendarDays"
                  :key="day.key"
                  type="button"
                  class="calendar-day"
                  :class="{ muted: !day.inMonth, active: day.date === selectedDiaryDate, filled: hasDiaryOnDate(day.date) }"
                  @click="openDiaryDate(day.date)"
                >
                  <span>{{ day.day }}</span>
                </button>
              </div>
            </template>

            <div v-else-if="diaryPickerMode === 'century'" :key="calendarMotionKey" class="year-grid calendar-motion" :class="calendarMotionClass">
              <button
                v-for="prefix in diaryCenturyOptions"
                :key="prefix"
                type="button"
                class="picker-cell"
                :class="{ active: prefix === diaryCenturyPrefix, marked: hasDiaryInCentury(prefix) }"
                @click="selectDiaryCentury(prefix)"
              >
                {{ prefix }}
              </button>
            </div>

            <div v-else-if="diaryPickerMode === 'year'" :key="calendarMotionKey" class="year-grid calendar-motion" :class="calendarMotionClass">
              <button
                v-for="year in diaryYearOptions"
                :key="year"
                type="button"
                class="picker-cell"
                :class="{ active: year === diaryCalendarYear, marked: hasDiaryInYear(year) }"
                @click="selectDiaryYear(year)"
              >
                {{ twoDigit(year % 100) }}
              </button>
            </div>

            <div v-else :key="calendarMotionKey" class="month-grid calendar-motion" :class="calendarMotionClass">
              <button
                v-for="month in 12"
                :key="month"
                type="button"
                class="picker-cell"
                :class="{ active: month - 1 === diaryCalendarMonth, marked: hasDiaryInMonth(diaryCalendarYear, month - 1) }"
                @click="selectDiaryMonth(month - 1)"
              >
                {{ month }}月
              </button>
            </div>
          </div>

          <div v-else class="diary-entry" :style="{ '--sticky-bg': diaryEntries[selectedDiaryDate]?.color || '#cce7ff' }">
            <div class="diary-entry-head">
              <div>
                <span>当前日期</span>
                <strong>{{ selectedDiaryDate }}</strong>
              </div>
              <button type="button" class="toolbar-icon-btn" aria-label="打开日历" title="打开日历" @click="showDiaryCalendar = true">
                <CalendarDays :size="18" />
              </button>
            </div>
            <textarea
              v-model="currentDiaryEntry.text"
              class="diary-textarea"
              maxlength="1200"
              placeholder="记录今天"
            ></textarea>
            <div class="color-row">
              <button
                v-for="color in tagColorOptions"
                :key="color"
                type="button"
                class="color-swatch"
                :class="{ active: currentDiaryEntry.color === color }"
                :style="{ backgroundColor: color }"
                :aria-label="`选择颜色 ${color}`"
                @click="currentDiaryEntry.color = color"
              ></button>
              <label class="custom-color">
                <input v-model="currentDiaryEntry.color" type="color" />
                <span>自定义</span>
              </label>
            </div>
          </div>
        </div>

        <div v-else-if="activeMode === 'worksheet'" class="content-view diary-view worksheet-view">
          <header class="content-toolbar diary-toolbar">
            <h1>工作表</h1>
            <p class="diary-hint">点击年份或月份选择时间，日历滚动切月，年份可横向滑动。</p>
            <div class="diary-actions">
              <button type="button" class="locate-time-btn" @click="locateWorksheetToday">
                <LocateFixed :size="18" />
                定位时间
              </button>
              <button type="button" class="time-machine-btn" @click="showWorksheetCalendar = !showWorksheetCalendar">
                <Clock3 :size="18" />
                时间机器
              </button>
            </div>
          </header>

          <div v-if="showWorksheetCalendar" class="diary-calendar" @wheel.prevent="handleWorksheetWheel">
            <div class="calendar-top">
              <button type="button" class="circle-action" aria-label="上一个时间段" @click="shiftWorksheetTime(-1)">
                <ChevronLeft :size="18" />
              </button>
              <div class="calendar-title">
                <div class="time-block-row">
                  <button
                    type="button"
                    class="time-block split-year-block"
                    :class="{ marked: hasWorksheetInCentury(worksheetCenturyPrefix) }"
                    @click="worksheetPickerMode = 'century'"
                  >
                    {{ worksheetCenturyPrefix }}
                  </button>
                  <button
                    type="button"
                    class="time-block split-year-block"
                    :class="{ marked: hasWorksheetInYear(worksheetCalendarYear) }"
                    @click="worksheetPickerMode = 'year'"
                  >
                    {{ worksheetYearSuffix }}
                  </button>
                  <span class="time-unit">年</span>
                  <button
                    type="button"
                    class="time-block month-block"
                    :class="{ marked: hasWorksheetInMonth(worksheetCalendarYear, worksheetCalendarMonth) }"
                    @click="worksheetPickerMode = 'month'"
                  >
                    {{ worksheetCalendarMonth + 1 }}
                  </button>
                  <span class="time-unit">月</span>
                </div>
                <span>{{ worksheetCalendarSubtitle }}</span>
              </div>
              <button type="button" class="circle-action" aria-label="下一个时间段" @click="shiftWorksheetTime(1)">
                <ChevronRight :size="18" />
              </button>
            </div>

            <template v-if="worksheetPickerMode === 'date'">
              <div class="calendar-weekdays">
                <span v-for="day in weekdayLabels" :key="day">{{ day }}</span>
              </div>
              <div class="calendar-grid" :key="worksheetCalendarMotionKey">
                <button
                  v-for="day in worksheetCalendarDays"
                  :key="day.key"
                  type="button"
                  class="calendar-day"
                  :class="{ muted: !day.inMonth, active: day.date === selectedWorksheetDate, filled: hasWorksheetOnDate(day.date) }"
                  @click="openWorksheetDate(day.date)"
                >
                  <span>{{ day.day }}</span>
                </button>
              </div>
            </template>

            <div v-else-if="worksheetPickerMode === 'century'" :key="worksheetCalendarMotionKey" class="year-grid calendar-motion" :class="worksheetCalendarMotionClass">
              <button
                v-for="prefix in worksheetCenturyOptions"
                :key="prefix"
                type="button"
                class="picker-cell"
                :class="{ active: prefix === worksheetCenturyPrefix, marked: hasWorksheetInCentury(prefix) }"
                @click="selectWorksheetCentury(prefix)"
              >
                {{ prefix }}
              </button>
            </div>

            <div v-else-if="worksheetPickerMode === 'year'" :key="worksheetCalendarMotionKey" class="year-grid calendar-motion" :class="worksheetCalendarMotionClass">
              <button
                v-for="year in worksheetYearOptions"
                :key="year"
                type="button"
                class="picker-cell"
                :class="{ active: year === worksheetCalendarYear, marked: hasWorksheetInYear(year) }"
                @click="selectWorksheetYear(year)"
              >
                {{ twoDigit(year % 100) }}
              </button>
            </div>

            <div v-else :key="worksheetCalendarMotionKey" class="month-grid calendar-motion" :class="worksheetCalendarMotionClass">
              <button
                v-for="month in 12"
                :key="month"
                type="button"
                class="picker-cell"
                :class="{ active: month - 1 === worksheetCalendarMonth, marked: hasWorksheetInMonth(worksheetCalendarYear, month - 1) }"
                @click="selectWorksheetMonth(month - 1)"
              >
                {{ month }}月
              </button>
            </div>
          </div>

          <div v-else-if="selectedWorksheetItem" class="worksheet-editor">
            <header class="content-toolbar sticky-detail-toolbar">
              <button type="button" class="back-btn" @click="closeWorksheetItem">返回</button>
              <div class="sticky-detail-title">
                <span>编辑事项</span>
                <small>{{ selectedWorksheetDate }}</small>
              </div>
              <button type="button" class="toolbar-icon-btn" aria-label="打开日历" title="打开日历" @click="showWorksheetCalendar = true">
                <CalendarDays :size="18" />
              </button>
            </header>
            <div class="worksheet-edit-card">
              <div class="worksheet-time-editor">
                <label>
                  <span>开始时间</span>
                  <input v-model="selectedWorksheetItem.start" type="time" :disabled="isWorksheetItemLocked(selectedWorksheetItem)" />
                </label>
                <label>
                  <span>结束时间</span>
                  <input v-model="selectedWorksheetItem.end" type="time" :disabled="isWorksheetItemLocked(selectedWorksheetItem)" />
                </label>
              </div>
              <div class="lined-textarea-shell">
                <div class="generated-lines" aria-hidden="true">
                  <span
                    v-for="line in worksheetEditorLineCount"
                    :key="line"
                    :style="{ top: `calc(${line} * var(--sticky-editor-line-height) + var(--sticky-editor-line-offset))` }"
                  ></span>
                </div>
                <textarea
                  v-model="selectedWorksheetItem.text"
                  class="sticky-editor-textarea"
                  maxlength="300"
                  placeholder="写下事项"
                  :disabled="isWorksheetItemLocked(selectedWorksheetItem)"
                ></textarea>
              </div>
            </div>
          </div>

          <div v-else class="worksheet-day">
            <header class="worksheet-day-toolbar">
              <div>
                <span>时间</span>
                <strong>{{ selectedWorksheetDate }}</strong>
              </div>
              <div class="worksheet-day-actions">
                <button type="button" class="icon-text-btn" @click="sortWorksheetItems">
                  <ArrowDownUp :size="17" />
                  排序
                </button>
                <button type="button" class="icon-text-btn" @click="addWorksheetItem">
                  <Plus :size="17" />
                  新增
                </button>
                <button type="button" class="toolbar-icon-btn" aria-label="打开日历" title="打开日历" @click="showWorksheetCalendar = true">
                  <CalendarDays :size="18" />
                </button>
              </div>
            </header>

            <div class="worksheet-list">
              <div class="worksheet-head">
                <span>状态</span>
                <span>时间</span>
                <span>事项</span>
                <span></span>
              </div>
              <div
                v-for="item in currentWorksheetItems"
                :key="item.id"
                class="worksheet-item"
                :class="{ completed: item.status === 'done', failed: item.status === 'failed' }"
              >
                <div class="worksheet-status-actions">
                  <button type="button" class="status-btn done-btn" aria-label="标记完成" @click="setWorksheetStatus(item, 'done')">
                    <Check :size="17" />
                  </button>
                  <button type="button" class="status-btn fail-btn" aria-label="标记未完成" @click="setWorksheetStatus(item, 'failed')">
                    <X :size="17" />
                  </button>
                </div>
                <button type="button" class="worksheet-time" @click="openWorksheetItem(item)">
                  {{ item.start || '--:--' }} - {{ item.end || '--:--' }}
                </button>
                <button type="button" class="worksheet-task-text" @click="openWorksheetItem(item)">
                  {{ item.text || '未命名事项' }}
                </button>
                <button type="button" class="circle-action delete-action" aria-label="删除事项" title="删除" @click="removeWorksheetItem(item.id)">
                  <X :size="16" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="content-view settings-view">
          <header class="content-toolbar">
            <h1>设置</h1>
            <button type="button" @click="resetSettings">重置</button>
          </header>
          <div class="settings-grid">
            <label>
              <span>文字颜色</span>
              <input v-model="settings.textColor" type="color" />
            </label>
            <label>
              <span>文字大小</span>
              <input v-model.number="settings.fontSize" type="range" min="14" max="24" step="1" />
              <strong>{{ settings.fontSize }}px</strong>
            </label>
            <label>
              <span>左侧背景颜色</span>
              <input v-model="settings.leftBg" type="color" />
            </label>
            <label>
              <span>右侧背景颜色</span>
              <input v-model="settings.rightBg" type="color" />
            </label>
          </div>

          <section class="custom-tags-panel" aria-label="自定义标签">
            <div class="custom-tags-header">
              <h2>标签管理</h2>
              <span>{{ settings.customTags.length }} 个 / {{ CUSTOM_TAG_LIMIT }} 个</span>
            </div>
            <div class="custom-tag-form">
              <input v-model.trim="newTagName" type="text" maxlength="10" placeholder="标签名" />
              <input v-model="newTagColor" type="color" aria-label="标签颜色" />
              <button type="button" class="icon-text-btn" :disabled="!canAddCustomTag" @click="addCustomTag">
                <Plus :size="17" />
                添加
              </button>
            </div>
            <p v-if="customTagMessage" class="custom-tag-message">{{ customTagMessage }}</p>
            <div class="custom-tag-list">
              <div
                v-for="tag in managedTags"
                :key="tag.id"
                class="custom-tag-item"
                :class="{ disabled: tag.disabled, default: tag.isDefault }"
              >
                <span class="tag-dot" :style="{ backgroundColor: tag.color }"></span>
                <span>{{ tag.name }}</span>
                <button
                  v-if="!tag.isDefault"
                  type="button"
                  class="circle-action delete-action"
                  aria-label="删除自定义标签"
                  title="删除"
                  @click.stop="removeCustomTag(tag.id)"
                >
                  <Check v-if="tag.disabled" :size="16" />
                  <X v-else :size="16" />
                </button>
                <button
                  v-else
                  type="button"
                  class="circle-action default-toggle-action"
                  :aria-label="tag.disabled ? '启用默认标签' : '禁用默认标签'"
                  :title="tag.disabled ? '启用' : '禁用'"
                  @click.stop="toggleManagedTag(tag)"
                >
                  <X :size="16" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>

      <img class="notebook-frame" src="/Notebook.png" alt="" draggable="false" />
    </section>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { ArrowDownUp, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Eye, LocateFixed, Pencil, Plus, X } from 'lucide-vue-next';

const STORAGE_KEY = 'notebook_notes_state_v2';
const LEGACY_STORAGE_KEY = 'notebook_notes_state_v1';
const CUSTOM_TAG_LIMIT = 15;

const modes = [
  { id: 'sticky', label: '便签', icon: '☑' },
  { id: 'note', label: '笔记', icon: '✎' },
  { id: 'diary', label: '日记', icon: '◴' },
  { id: 'worksheet', label: '工作表', icon: '▦' },
  { id: 'settings', label: '设置', icon: '⚙' },
];

const defaultTags = [
  { id: 'life', name: '生活', color: '#fff29d' },
  { id: 'study', name: '学习', color: '#cce7ff' },
  { id: 'fun', name: '娱乐', color: '#ffd6e3' },
  { id: 'work', name: '工作', color: '#d9f7be' },
];

const tagColorOptions = ['#fff29d', '#cce7ff', '#ffd6e3', '#d9f7be', '#ffe0b2', '#d8d2ff'];

const makeSticky = (note = {}) => {
  const tag = defaultTags.find((item) => item.id === note.tagId) || defaultTags[0];

  return {
    id: note.id ?? Date.now(),
    text: note.text ?? '',
    tagId: note.tagId ?? tag.id,
    color: note.color ?? tag.color,
  };
};

const defaultState = {
  activeMode: 'sticky',
  stickyNotes: [
    makeSticky({ id: 1, text: '今天要完成的事', tagId: 'study', color: '#cce7ff' }),
    makeSticky({ id: 2, text: '灵感先放这里', tagId: 'fun', color: '#ffd6e3' }),
  ],
  noteNotes: [
    makeSticky({ id: 1, text: '我的第一条笔记', tagId: 'study', color: '#cce7ff' }),
  ],
  longNote: {
    title: '我的笔记',
    body: '',
  },
  diaryEntries: {},
  worksheetEntries: {},
  worksheetRows: [
    { id: 1, done: false, task: '整理学习计划', date: '' },
  ],
  settings: {
    textColor: '#2f2a24',
    fontSize: 17,
    leftBg: '#fff7cf',
    rightBg: '#fffdf7',
    customTags: [],
    disabledDefaultTagIds: [],
  },
};

const cloneDefaultState = () => structuredClone(defaultState);

function migrateWorksheetRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return {};

  const todayKey = toDateKey(new Date());
  return {
    [todayKey]: rows.map((row, index) => ({
      id: row.id ?? index + 1,
      start: '',
      end: '',
      text: row.task || '',
      status: row.done ? 'done' : null,
    })),
  };
}

const normalizeState = (state) => {
  const base = cloneDefaultState();
  const migratedWorksheetEntries = state?.worksheetEntries || migrateWorksheetRows(state?.worksheetRows);
  const settings = {
    ...base.settings,
    ...(state?.settings || {}),
    customTags: Array.isArray(state?.settings?.customTags) ? state.settings.customTags : [],
    disabledDefaultTagIds: Array.isArray(state?.settings?.disabledDefaultTagIds) ? state.settings.disabledDefaultTagIds : [],
  };

  return {
    ...base,
    ...state,
    stickyNotes: Array.isArray(state?.stickyNotes) ? state.stickyNotes.map(makeSticky) : base.stickyNotes,
    noteNotes: Array.isArray(state?.noteNotes) ? state.noteNotes.map(makeSticky) : base.noteNotes,
    longNote: { ...base.longNote, ...(state?.longNote || {}) },
    diaryEntries: state?.diaryEntries || base.diaryEntries,
    worksheetEntries: migratedWorksheetEntries,
    worksheetRows: Array.isArray(state?.worksheetRows) ? state.worksheetRows : base.worksheetRows,
    settings,
  };
};

const loadState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || 'null');
    return saved ? normalizeState(saved) : cloneDefaultState();
  } catch (err) {
    return cloneDefaultState();
  }
};

const initialState = loadState();
const activeMode = ref(initialState.activeMode);
const stickyNotes = ref(initialState.stickyNotes);
const noteNotes = ref(initialState.noteNotes);
const longNote = ref(initialState.longNote);
const diaryEntries = ref(initialState.diaryEntries);
const worksheetEntries = ref(initialState.worksheetEntries);
const worksheetRows = ref(initialState.worksheetRows);
const settings = ref(initialState.settings);
const selectedStickyId = ref(null);
const stickyDetailMode = ref(null);
const selectedNoteId = ref(null);
const noteDetailMode = ref(null);
const today = new Date();
const selectedDiaryDate = ref(toDateKey(today));
const diaryCalendarYear = ref(today.getFullYear());
const diaryCalendarMonth = ref(today.getMonth());
const diaryPickerMode = ref('date');
const showDiaryCalendar = ref(true);
const diaryWheelLocked = ref(false);
const calendarMotionDirection = ref('next');
const selectedWorksheetDate = ref(toDateKey(today));
const worksheetCalendarYear = ref(today.getFullYear());
const worksheetCalendarMonth = ref(today.getMonth());
const worksheetPickerMode = ref('date');
const showWorksheetCalendar = ref(true);
const worksheetWheelLocked = ref(false);
const worksheetCalendarMotionDirection = ref('next');
const selectedWorksheetItemId = ref(null);
const newTagName = ref('');
const newTagColor = ref('#fff29d');
const customTagError = ref('');

const allTags = computed(() => [...defaultTags, ...settings.value.customTags]);

const disabledDefaultTagIds = computed(() => new Set(settings.value.disabledDefaultTagIds || []));

const managedTags = computed(() => [
  ...defaultTags.map((tag) => ({
    ...tag,
    isDefault: true,
    disabled: disabledDefaultTagIds.value.has(tag.id),
  })),
  ...settings.value.customTags.map((tag) => ({
    ...tag,
    isDefault: false,
    disabled: false,
  })),
]);

const selectableTags = computed(() => {
  const enabled = managedTags.value.filter((tag) => !tag.disabled);
  return enabled.length ? enabled : managedTags.value;
});

const normalizedNewTagName = computed(() => newTagName.value.trim().toLowerCase());

const isDuplicateTagName = computed(() => {
  if (!normalizedNewTagName.value) return false;
  return allTags.value.some((tag) => tag.name.trim().toLowerCase() === normalizedNewTagName.value);
});

const isCustomTagLimitReached = computed(() => settings.value.customTags.length >= CUSTOM_TAG_LIMIT);

const canAddCustomTag = computed(() => Boolean(normalizedNewTagName.value) && !isDuplicateTagName.value && !isCustomTagLimitReached.value);

const customTagMessage = computed(() => {
  if (customTagError.value) return customTagError.value;
  if (isCustomTagLimitReached.value) return `自定义标签最多 ${CUSTOM_TAG_LIMIT} 个`;
  if (isDuplicateTagName.value) return '标签名字不能重复';
  return '';
});

const selectedSticky = computed(() => stickyNotes.value.find((note) => note.id === selectedStickyId.value) || null);
const selectedNote = computed(() => noteNotes.value.find((note) => note.id === selectedNoteId.value) || null);

const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];

const diaryCenturyPrefix = computed(() => Math.floor(diaryCalendarYear.value / 100));
const diaryYearSuffix = computed(() => twoDigit(diaryCalendarYear.value % 100));
const diaryCenturyStart = computed(() => Math.floor(diaryCenturyPrefix.value / 10) * 10);
const diaryDecadeStart = computed(() => Math.floor((diaryCalendarYear.value % 100) / 10) * 10);

const diaryCenturyOptions = computed(() => Array.from({ length: 10 }, (_, index) => diaryCenturyStart.value + index));

const diaryYearOptions = computed(() => {
  const centuryBase = diaryCenturyPrefix.value * 100;
  return Array.from({ length: 10 }, (_, index) => centuryBase + diaryDecadeStart.value + index);
});

const calendarSubtitle = computed(() => {
  if (diaryPickerMode.value === 'century') return `${diaryCenturyStart.value}00-${diaryCenturyStart.value + 9}99`;
  if (diaryPickerMode.value === 'year') return `${diaryCenturyPrefix.value}${twoDigit(diaryDecadeStart.value)}-${diaryCenturyPrefix.value}${twoDigit(diaryDecadeStart.value + 9)}`;
  if (diaryPickerMode.value === 'month') return '选择月份后返回日期';
  return selectedDiaryDate.value;
});

const calendarMotionKey = computed(() => `${diaryPickerMode.value}-${diaryCalendarYear.value}-${diaryCalendarMonth.value}-${diaryCenturyStart.value}-${diaryDecadeStart.value}`);

const calendarMotionClass = computed(() => `calendar-motion-${calendarMotionDirection.value}`);

const diaryCalendarDays = computed(() => {
  const firstDay = new Date(diaryCalendarYear.value, diaryCalendarMonth.value, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      date: toDateKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === diaryCalendarMonth.value,
    };
  });
});

const worksheetCenturyPrefix = computed(() => Math.floor(worksheetCalendarYear.value / 100));
const worksheetYearSuffix = computed(() => twoDigit(worksheetCalendarYear.value % 100));
const worksheetCenturyStart = computed(() => Math.floor(worksheetCenturyPrefix.value / 10) * 10);
const worksheetDecadeStart = computed(() => Math.floor((worksheetCalendarYear.value % 100) / 10) * 10);

const worksheetCenturyOptions = computed(() => Array.from({ length: 10 }, (_, index) => worksheetCenturyStart.value + index));

const worksheetYearOptions = computed(() => {
  const centuryBase = worksheetCenturyPrefix.value * 100;
  return Array.from({ length: 10 }, (_, index) => centuryBase + worksheetDecadeStart.value + index);
});

const worksheetCalendarSubtitle = computed(() => {
  if (worksheetPickerMode.value === 'century') return `${worksheetCenturyStart.value}00-${worksheetCenturyStart.value + 9}99`;
  if (worksheetPickerMode.value === 'year') return `${worksheetCenturyPrefix.value}${twoDigit(worksheetDecadeStart.value)}-${worksheetCenturyPrefix.value}${twoDigit(worksheetDecadeStart.value + 9)}`;
  if (worksheetPickerMode.value === 'month') return '选择月份后返回日期';
  return selectedWorksheetDate.value;
});

const worksheetCalendarMotionKey = computed(() => `${worksheetPickerMode.value}-${worksheetCalendarYear.value}-${worksheetCalendarMonth.value}-${worksheetCenturyStart.value}-${worksheetDecadeStart.value}`);

const worksheetCalendarMotionClass = computed(() => `calendar-motion-${worksheetCalendarMotionDirection.value}`);

const worksheetCalendarDays = computed(() => {
  const firstDay = new Date(worksheetCalendarYear.value, worksheetCalendarMonth.value, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      date: toDateKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === worksheetCalendarMonth.value,
    };
  });
});

const currentDiaryEntry = computed(() => {
  if (!diaryEntries.value[selectedDiaryDate.value]) {
    diaryEntries.value[selectedDiaryDate.value] = { text: '', color: '#cce7ff' };
  }

  return diaryEntries.value[selectedDiaryDate.value];
});

const currentWorksheetItems = computed(() => {
  if (!Array.isArray(worksheetEntries.value[selectedWorksheetDate.value])) {
    worksheetEntries.value[selectedWorksheetDate.value] = [];
  }

  return worksheetEntries.value[selectedWorksheetDate.value];
});

const selectedWorksheetItem = computed(() => currentWorksheetItems.value.find((item) => item.id === selectedWorksheetItemId.value) || null);

const worksheetEditorLineCount = computed(() => editorLineCount({ text: selectedWorksheetItem.value?.text || '' }));

const activeModeLabel = computed(() => modes.find((mode) => mode.id === activeMode.value)?.label || '笔记');

const quickMeta = computed(() => {
  if (activeMode.value === 'sticky') return `${stickyNotes.value.length} 张便签`;
  if (activeMode.value === 'note') return `${noteNotes.value.length} 条笔记`;
  if (activeMode.value === 'diary') return selectedDiaryDate.value;
  if (activeMode.value === 'worksheet') return `${selectedWorksheetDate.value} · ${currentWorksheetItems.value.length} 条事项`;
  if (activeMode.value === 'settings') return `${allTags.value.length} 个标签`;
  return longNote.value.title || '未命名';
});

const notebookVars = computed(() => ({
  '--note-text-color': settings.value.textColor,
  '--note-font-size': `${settings.value.fontSize}px`,
  '--left-page-bg': settings.value.leftBg,
  '--right-page-bg': settings.value.rightBg,
}));

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    activeMode: activeMode.value,
    stickyNotes: stickyNotes.value,
    noteNotes: noteNotes.value,
    longNote: longNote.value,
    diaryEntries: diaryEntries.value,
    worksheetEntries: worksheetEntries.value,
    worksheetRows: worksheetRows.value,
    settings: settings.value,
  }));
};

watch([activeMode, stickyNotes, noteNotes, longNote, diaryEntries, worksheetEntries, worksheetRows, settings], saveState, { deep: true });

watch(selectedSticky, (note) => {
  if (!note && stickyDetailMode.value) closeStickyDetail();
});

watch(selectedNote, (note) => {
  if (!note && noteDetailMode.value) closeNoteDetail();
});

watch(newTagName, () => {
  customTagError.value = '';
});

const nextId = (items) => Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;

const stickyTagName = (note) => allTags.value.find((tag) => tag.id === note.tagId)?.name || '生活';
const noteTagName = (note) => allTags.value.find((tag) => tag.id === note.tagId)?.name || '生活';

const stickyCardStyle = (note) => ({
  '--sticky-bg': note.color || defaultTags[0].color,
});

const noteCardStyle = (note) => ({
  '--sticky-bg': note.color || defaultTags[0].color,
});

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function twoDigit(value) {
  return String(value).padStart(2, '0');
}

const hasDiaryOnDate = (dateKey) => Boolean(diaryEntries.value[dateKey]?.text?.trim());

const hasDiaryInMonth = (year, month) => {
  const prefix = `${year}-${twoDigit(month + 1)}-`;
  return Object.keys(diaryEntries.value).some((dateKey) => dateKey.startsWith(prefix) && hasDiaryOnDate(dateKey));
};

const hasDiaryInYear = (year) => {
  const prefix = `${year}-`;
  return Object.keys(diaryEntries.value).some((dateKey) => dateKey.startsWith(prefix) && hasDiaryOnDate(dateKey));
};

const hasDiaryInCentury = (prefix) => {
  const start = prefix * 100;
  const end = start + 99;

  return Object.keys(diaryEntries.value).some((dateKey) => {
    if (!hasDiaryOnDate(dateKey)) return false;
    const year = Number(dateKey.slice(0, 4));
    return year >= start && year <= end;
  });
};

const hasWorksheetOnDate = (dateKey) => Boolean(worksheetEntries.value[dateKey]?.some((item) => item.text?.trim()));

const hasWorksheetInMonth = (year, month) => {
  const prefix = `${year}-${twoDigit(month + 1)}-`;
  return Object.keys(worksheetEntries.value).some((dateKey) => dateKey.startsWith(prefix) && hasWorksheetOnDate(dateKey));
};

const hasWorksheetInYear = (year) => {
  const prefix = `${year}-`;
  return Object.keys(worksheetEntries.value).some((dateKey) => dateKey.startsWith(prefix) && hasWorksheetOnDate(dateKey));
};

const hasWorksheetInCentury = (prefix) => {
  const start = prefix * 100;
  const end = start + 99;

  return Object.keys(worksheetEntries.value).some((dateKey) => {
    if (!hasWorksheetOnDate(dateKey)) return false;
    const year = Number(dateKey.slice(0, 4));
    return year >= start && year <= end;
  });
};

const setMode = (modeId) => {
  activeMode.value = modeId;
  closeStickyDetail();
  closeNoteDetail();
  closeWorksheetItem();
};

const openStickyDetail = (note, mode) => {
  selectedStickyId.value = note.id;
  stickyDetailMode.value = mode;
};

const closeStickyDetail = () => {
  selectedStickyId.value = null;
  stickyDetailMode.value = null;
};

const syncStickyTagColor = (note) => {
  const tag = allTags.value.find((item) => item.id === note.tagId);
  if (tag) note.color = tag.color;
};

const setStickyColor = (note, color) => {
  note.color = color;
};

const editorLineCount = (note) => {
  const text = note?.text || '';
  if (!text) return 0;

  return Math.max(0, text.split('\n').length - 1);
};

const addSticky = () => {
  stickyNotes.value.unshift(makeSticky({ id: nextId(stickyNotes.value), text: '' }));
};

const removeSticky = (id) => {
  stickyNotes.value = stickyNotes.value.filter((note) => note.id !== id);
};

const openNoteDetail = (note, mode) => {
  selectedNoteId.value = note.id;
  noteDetailMode.value = mode;
};

const closeNoteDetail = () => {
  selectedNoteId.value = null;
  noteDetailMode.value = null;
};

const syncNoteTagColor = (note) => {
  const tag = allTags.value.find((item) => item.id === note.tagId);
  if (tag) note.color = tag.color;
};

const setNoteColor = (note, color) => {
  note.color = color;
};

const toggleManagedTag = (tag) => {
  if (!tag.isDefault) return;

  const disabledIds = new Set(settings.value.disabledDefaultTagIds || []);
  if (disabledIds.has(tag.id)) {
    disabledIds.delete(tag.id);
  } else {
    disabledIds.add(tag.id);
  }
  settings.value.disabledDefaultTagIds = [...disabledIds];
};

const addNote = () => {
  noteNotes.value.unshift(makeSticky({ id: nextId(noteNotes.value), text: '' }));
};

const removeNote = (id) => {
  noteNotes.value = noteNotes.value.filter((note) => note.id !== id);
};

const shiftDiaryTime = (offset) => {
  calendarMotionDirection.value = offset > 0 ? 'next' : 'prev';

  if (diaryPickerMode.value === 'century') {
    diaryCalendarYear.value += offset * 1000;
    return;
  }

  if (diaryPickerMode.value === 'year') {
    diaryCalendarYear.value += offset * 10;
    return;
  }

  if (diaryPickerMode.value === 'month') {
    diaryCalendarYear.value += offset;
    return;
  }

  const date = new Date(diaryCalendarYear.value, diaryCalendarMonth.value + offset, 1);
  diaryCalendarYear.value = date.getFullYear();
  diaryCalendarMonth.value = date.getMonth();
};

const handleDiaryWheel = (event) => {
  if (diaryWheelLocked.value) return;

  if (diaryPickerMode.value === 'date' || diaryPickerMode.value === 'month') {
    shiftDiaryTime(event.deltaY > 0 ? 1 : -1);
  } else if (diaryPickerMode.value === 'century' || diaryPickerMode.value === 'year') {
    const horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    shiftDiaryTime(horizontalDelta > 0 ? 1 : -1);
  } else {
    return;
  }

  diaryWheelLocked.value = true;
  window.setTimeout(() => {
    diaryWheelLocked.value = false;
  }, 320);
};

const locateToday = () => {
  const now = new Date();
  selectedDiaryDate.value = toDateKey(now);
  diaryCalendarYear.value = now.getFullYear();
  diaryCalendarMonth.value = now.getMonth();
  diaryPickerMode.value = 'date';
  showDiaryCalendar.value = true;
};

const selectDiaryCentury = (prefix) => {
  calendarMotionDirection.value = prefix > diaryCenturyPrefix.value ? 'next' : 'prev';
  const suffix = diaryCalendarYear.value % 100;
  diaryCalendarYear.value = prefix * 100 + suffix;
  diaryPickerMode.value = 'year';
};

const selectDiaryYear = (year) => {
  calendarMotionDirection.value = year > diaryCalendarYear.value ? 'next' : 'prev';
  diaryCalendarYear.value = year;
  diaryPickerMode.value = 'month';
};

const selectDiaryMonth = (month) => {
  calendarMotionDirection.value = month > diaryCalendarMonth.value ? 'next' : 'prev';
  diaryCalendarMonth.value = month;
  diaryPickerMode.value = 'date';
};

const openDiaryDate = (dateKey) => {
  selectedDiaryDate.value = dateKey;
  const date = new Date(`${dateKey}T00:00:00`);
  diaryCalendarYear.value = date.getFullYear();
  diaryCalendarMonth.value = date.getMonth();
  showDiaryCalendar.value = false;
};

const shiftWorksheetTime = (offset) => {
  worksheetCalendarMotionDirection.value = offset > 0 ? 'next' : 'prev';

  if (worksheetPickerMode.value === 'century') {
    worksheetCalendarYear.value += offset * 1000;
    return;
  }

  if (worksheetPickerMode.value === 'year') {
    worksheetCalendarYear.value += offset * 10;
    return;
  }

  if (worksheetPickerMode.value === 'month') {
    worksheetCalendarYear.value += offset;
    return;
  }

  const date = new Date(worksheetCalendarYear.value, worksheetCalendarMonth.value + offset, 1);
  worksheetCalendarYear.value = date.getFullYear();
  worksheetCalendarMonth.value = date.getMonth();
};

const handleWorksheetWheel = (event) => {
  if (worksheetWheelLocked.value) return;

  if (worksheetPickerMode.value === 'date' || worksheetPickerMode.value === 'month') {
    shiftWorksheetTime(event.deltaY > 0 ? 1 : -1);
  } else if (worksheetPickerMode.value === 'century' || worksheetPickerMode.value === 'year') {
    const horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    shiftWorksheetTime(horizontalDelta > 0 ? 1 : -1);
  } else {
    return;
  }

  worksheetWheelLocked.value = true;
  window.setTimeout(() => {
    worksheetWheelLocked.value = false;
  }, 320);
};

const locateWorksheetToday = () => {
  const now = new Date();
  selectedWorksheetDate.value = toDateKey(now);
  worksheetCalendarYear.value = now.getFullYear();
  worksheetCalendarMonth.value = now.getMonth();
  worksheetPickerMode.value = 'date';
  showWorksheetCalendar.value = true;
  closeWorksheetItem();
};

const selectWorksheetCentury = (prefix) => {
  worksheetCalendarMotionDirection.value = prefix > worksheetCenturyPrefix.value ? 'next' : 'prev';
  const suffix = worksheetCalendarYear.value % 100;
  worksheetCalendarYear.value = prefix * 100 + suffix;
  worksheetPickerMode.value = 'year';
};

const selectWorksheetYear = (year) => {
  worksheetCalendarMotionDirection.value = year > worksheetCalendarYear.value ? 'next' : 'prev';
  worksheetCalendarYear.value = year;
  worksheetPickerMode.value = 'month';
};

const selectWorksheetMonth = (month) => {
  worksheetCalendarMotionDirection.value = month > worksheetCalendarMonth.value ? 'next' : 'prev';
  worksheetCalendarMonth.value = month;
  worksheetPickerMode.value = 'date';
};

const openWorksheetDate = (dateKey) => {
  selectedWorksheetDate.value = dateKey;
  const date = new Date(`${dateKey}T00:00:00`);
  worksheetCalendarYear.value = date.getFullYear();
  worksheetCalendarMonth.value = date.getMonth();
  showWorksheetCalendar.value = false;
  closeWorksheetItem();
};

const isWorksheetItemLocked = (item) => item?.status === 'done' || item?.status === 'failed';

const addWorksheetItem = () => {
  currentWorksheetItems.value.push({
    id: nextId(currentWorksheetItems.value),
    start: '',
    end: '',
    text: '',
    status: null,
  });
  selectedWorksheetItemId.value = currentWorksheetItems.value[0]?.id ? currentWorksheetItems.value[currentWorksheetItems.value.length - 1].id : null;
};

const openWorksheetItem = (item) => {
  selectedWorksheetItemId.value = item.id;
};

const closeWorksheetItem = () => {
  selectedWorksheetItemId.value = null;
};

const removeWorksheetItem = (id) => {
  worksheetEntries.value[selectedWorksheetDate.value] = currentWorksheetItems.value.filter((item) => item.id !== id);
};

const setWorksheetStatus = (item, status) => {
  item.status = item.status === status ? null : status;
};

const sortWorksheetItems = () => {
  worksheetEntries.value[selectedWorksheetDate.value] = [...currentWorksheetItems.value].sort((a, b) => {
    const aTime = a.start || '99:99';
    const bTime = b.start || '99:99';
    return aTime.localeCompare(bTime);
  });
};

const addWorksheetRow = () => {
  worksheetRows.value.push({ id: nextId(worksheetRows.value), done: false, task: '', date: '' });
};

const removeWorksheetRow = (id) => {
  worksheetRows.value = worksheetRows.value.filter((row) => row.id !== id);
};

const addCustomTag = () => {
  if (isCustomTagLimitReached.value) {
    customTagError.value = `自定义标签最多 ${CUSTOM_TAG_LIMIT} 个`;
    return;
  }

  if (isDuplicateTagName.value) {
    customTagError.value = '标签名字不能重复';
    return;
  }

  if (!normalizedNewTagName.value) return;

  settings.value.customTags.push({
    id: `custom-${Date.now()}`,
    name: newTagName.value.trim(),
    color: newTagColor.value,
  });
  newTagName.value = '';
  customTagError.value = '';
};

const removeCustomTag = (id) => {
  settings.value.customTags = settings.value.customTags.filter((tag) => tag.id !== id);
  const fallbackTag = selectableTags.value[0] || defaultTags[0];
  stickyNotes.value.forEach((note) => {
    if (note.tagId === id) {
      note.tagId = fallbackTag.id;
      note.color = fallbackTag.color;
    }
  });
  noteNotes.value.forEach((note) => {
    if (note.tagId === id) {
      note.tagId = fallbackTag.id;
      note.color = fallbackTag.color;
    }
  });
};

const resetSettings = () => {
  settings.value = { ...cloneDefaultState().settings };
};
</script>

<style scoped>
.notes-page {
  min-height: calc(100dvh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(8px, 1.5vw, 18px);
  color: var(--note-text-color);
  font-size: var(--note-font-size);
  overflow: hidden;
}

.notebook-stage {
  top: -46px;
  position: relative;
  width: min(
    1480px,
    calc(100vw - 32px),
    calc((100dvh - var(--navbar-height) - 36px) * 1.5)
  );
  aspect-ratio: 3 / 2;
  isolation: isolate;
}

.notebook-frame {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.page-fill,
.notebook-left-page,
.notebook-right-page {
  position: absolute;
}

.page-fill {
  z-index: 1;
  border-radius: 16px;
}

.left-page-fill {
  left: 2.6%;
  top: 4.3%;
  width: 26.6%;
  height: 89.8%;
  background: var(--left-page-bg);
}

.right-page-fill {
  left: 30%;
  top: 4.2%;
  width: 64.2%;
  height: 89.8%;
  background: var(--right-page-bg);
}

.notebook-left-page {
  z-index: 4;
  left: 5.2%;
  top: 11%;
  width: 19.8%;
  height: 78%;
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 2vw, 28px);
}

.notebook-right-page {
  z-index: 4;
  left: 35%;
  top: 9%;
  width: 55.2%;
  height: 82%;
  overflow: hidden;
}

.mode-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 10px 14px;
  border: 1px solid rgba(109, 80, 35, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.42);
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: left;
  transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.mode-btn:hover,
.mode-btn.active {
  transform: translateX(4px);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 10px 24px rgba(120, 91, 38, 0.14);
}

.mode-icon {
  width: 26px;
  text-align: center;
}

.quick-panel {
  margin-top: auto;
  padding: 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.32);
  border: 1px solid rgba(109, 80, 35, 0.14);
}

.quick-title {
  font-size: 1.4em;
  font-weight: 800;
}

.quick-meta {
  margin-top: 6px;
  color: color-mix(in srgb, var(--note-text-color), transparent 30%);
}

.content-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.content-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex: 0 0 auto;
  min-height: 42px;
}

.content-toolbar h1 {
  font-size: 1.35em;
  line-height: 1.2;
}

.content-toolbar button,
.delete-btn,
.icon-text-btn {
  border: 1px solid rgba(105, 78, 40, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
  color: inherit;
  font: inherit;
  font-weight: 700;
  padding: 8px 12px;
}

.toolbar-icon-btn,
.circle-action {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border: 1px solid rgba(84, 64, 34, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #4d4335;
  padding: 0;
  box-shadow: 0 4px 10px rgba(94, 73, 38, 0.1);
}

.delete-action {
  background: rgba(255, 255, 255, 0.9);
  color: #7f322e;
}

.sticky-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  overflow: auto;
  padding-right: 6px;
}

.sticky-card {
  min-height: 150px;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 56px 20px 18px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--sticky-bg), white 20%);
  box-shadow: 0 10px 28px rgba(117, 89, 30, 0.12);
}

.sticky-card-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 7px;
}

.sticky-tag,
.sticky-reader-tag {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  max-width: 100%;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.45);
  font-size: 0.78em;
  font-weight: 800;
}

.sticky-tag {
  position: absolute;
  top: 14px;
  left: 20px;
  min-height: 30px;
}

.tag-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(54, 43, 24, 0.14);
}

.sticky-preview {
  min-height: 0;
  margin: 0;
  color: color-mix(in srgb, var(--note-text-color), transparent 8%);
  line-height: 1.55;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  word-break: break-word;
}

.sticky-detail-toolbar {
  align-items: center;
}

.sticky-detail-title {
  display: grid;
  justify-items: center;
  gap: 2px;
  font-weight: 900;
}

.sticky-detail-title small {
  color: color-mix(in srgb, var(--note-text-color), transparent 42%);
  font-size: 0.7em;
}

.back-btn {
  min-width: 64px;
}

.sticky-editor,
.sticky-reader {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--sticky-bg), white 18%);
  box-shadow: 0 12px 30px rgba(117, 89, 30, 0.14);
}

.lined-textarea-shell {
  --sticky-editor-line-height: 28px;
  --sticky-editor-line-offset: 7px;
  position: relative;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  border: 1px solid rgba(105, 78, 40, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.32);
}

.generated-lines {
  position: absolute;
  inset: 0 10px;
  pointer-events: none;
}

.generated-lines span {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(111, 136, 150, 0.18);
}

.sticky-editor-textarea {
  position: relative;
  z-index: 1;
  height: 100%;
  border: 0;
  background: transparent;
  line-height: var(--sticky-editor-line-height);
}

.sticky-editor-panel {
  display: grid;
  grid-template-columns: minmax(140px, 0.8fr) minmax(0, 1.2fr);
  gap: 12px;
}

.field-label {
  display: grid;
  gap: 8px;
  font-weight: 800;
}

.field-label select {
  width: 100%;
  height: 40px;
  border: 1px solid rgba(105, 78, 40, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
  color: inherit;
  font: inherit;
  padding: 0 10px;
}

.color-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgba(84, 64, 34, 0.2);
}

.color-swatch.active {
  box-shadow: 0 0 0 3px rgba(68, 52, 31, 0.26);
}

.custom-color {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  font-size: 0.82em;
  font-weight: 800;
}

.custom-color input {
  width: 28px;
  height: 28px;
  border: 0;
  padding: 0;
  background: transparent;
}

.sticky-reader {
  overflow: auto;
}

.sticky-reader p {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.7;
  word-break: break-word;
}

textarea,
input[type="text"],
input[type="date"] {
  width: 100%;
  border: 1px solid rgba(105, 78, 40, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.56);
  color: inherit;
  font: inherit;
  outline: none;
}

textarea {
  resize: none;
  flex: 1;
  min-height: 0;
  padding: 10px;
  line-height: 1.55;
}

.note-title-input {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  font-size: 1.15em;
  font-weight: 800;
}

.note-body-input {
  height: 100%;
  min-height: 0;
  background:
    linear-gradient(transparent calc(1.7em - 1px), rgba(89, 132, 168, 0.18) 1px),
    rgba(255, 255, 255, 0.28);
  background-size: 100% 1.7em;
}

.diary-view {
  --tech-cyan: #42d9ff;
  --tech-ink: #203141;
}

.diary-toolbar {
  align-items: center;
}

.diary-toolbar h1 {
  flex: 0 0 auto;
}

.diary-hint {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: rgba(32, 49, 65, 0.56);
  font-size: 0.78em;
  font-weight: 800;
  text-align: right;
}

.diary-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.time-machine-btn,
.locate-time-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
  border-color: rgba(66, 217, 255, 0.46);
  background:
    linear-gradient(135deg, rgba(66, 217, 255, 0.26), rgba(255, 255, 255, 0.64)),
    rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 22px rgba(66, 217, 255, 0.18);
}

.locate-time-btn {
  border-color: rgba(255, 154, 177, 0.42);
  background:
    linear-gradient(135deg, rgba(255, 154, 177, 0.18), rgba(255, 255, 255, 0.68)),
    rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 18px rgba(255, 154, 177, 0.14);
}

.time-machine-btn::after {
  content: "";
  position: absolute;
  inset: 5px 10px auto auto;
  width: 34px;
  height: 1px;
  background: var(--tech-cyan);
  box-shadow: 0 7px 0 rgba(66, 217, 255, 0.55), 0 14px 0 rgba(66, 217, 255, 0.28);
  opacity: 0.7;
}

.diary-calendar,
.diary-entry {
  min-height: 0;
  flex: 1;
  border-radius: 8px;
  border: 1px solid rgba(66, 217, 255, 0.26);
  background:
    linear-gradient(90deg, rgba(66, 217, 255, 0.12) 1px, transparent 1px),
    linear-gradient(rgba(66, 217, 255, 0.1) 1px, transparent 1px),
    rgba(245, 252, 255, 0.5);
  background-size: 28px 28px;
  box-shadow: inset 0 0 28px rgba(66, 217, 255, 0.1), 0 16px 34px rgba(31, 92, 120, 0.12);
}

.diary-calendar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.calendar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.48);
}

.calendar-top .calendar-title {
  display: grid;
  justify-items: center;
  gap: 2px;
}

.calendar-top span {
  font-size: 0.75em;
  color: rgba(32, 49, 65, 0.62);
}

.calendar-title {
  display: grid;
  justify-items: center;
  gap: 6px;
}

.time-block-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.time-block {
  min-width: 62px;
  height: 42px;
  border: 1px solid rgba(66, 217, 255, 0.42);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(66, 217, 255, 0.18), rgba(255, 255, 255, 0.68)),
    rgba(255, 255, 255, 0.54);
  color: var(--tech-ink);
  font: inherit;
  font-size: 1.1em;
  font-weight: 900;
  box-shadow: inset 0 0 18px rgba(66, 217, 255, 0.12), 0 8px 18px rgba(31, 92, 120, 0.08);
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.time-block:hover,
.picker-cell:hover,
.calendar-day:hover {
  transform: translateY(-1px);
  border-color: rgba(66, 217, 255, 0.72);
}

.month-block {
  min-width: 58px;
}

.split-year-block {
  min-width: 54px;
}

.time-unit {
  color: var(--tech-ink);
  font-size: 1em;
  font-weight: 900;
}

.calendar-weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.calendar-weekdays span {
  text-align: center;
  font-size: 0.78em;
  font-weight: 900;
  color: rgba(32, 49, 65, 0.6);
}

.calendar-grid {
  min-height: 0;
  flex: 1;
}

.year-grid,
.month-grid {
  min-height: 0;
  flex: 1;
  display: grid;
  gap: 10px;
}

.calendar-motion {
  animation-duration: 0.22s;
  animation-timing-function: ease;
  animation-fill-mode: both;
}

.calendar-motion-next {
  animation-name: calendarSlideNext;
}

.calendar-motion-prev {
  animation-name: calendarSlidePrev;
}

@keyframes calendarSlideNext {
  from {
    opacity: 0.42;
    transform: translateX(18px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes calendarSlidePrev {
  from {
    opacity: 0.42;
    transform: translateX(-18px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.year-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.month-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.calendar-day {
  position: relative;
  min-width: 0;
  min-height: 34px;
  border: 1px solid rgba(66, 217, 255, 0.34);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(66, 217, 255, 0.13), rgba(255, 255, 255, 0.64)),
    rgba(237, 252, 255, 0.68);
  color: var(--tech-ink);
  font: inherit;
  font-weight: 800;
  box-shadow: inset 0 0 16px rgba(66, 217, 255, 0.08), 0 8px 18px rgba(31, 92, 120, 0.06);
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, opacity 0.18s ease, box-shadow 0.18s ease;
}

.picker-cell {
  min-width: 0;
  min-height: 62px;
  border: 1px solid rgba(66, 217, 255, 0.26);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(66, 217, 255, 0.1), rgba(255, 255, 255, 0.62)),
    rgba(255, 255, 255, 0.5);
  color: var(--tech-ink);
  font: inherit;
  font-size: 1.08em;
  font-weight: 900;
  box-shadow: inset 0 0 16px rgba(66, 217, 255, 0.08);
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.calendar-day.muted {
  opacity: 0.34;
}

.calendar-day.active,
.picker-cell.active {
  border-color: rgba(66, 217, 255, 0.92);
  background:
    linear-gradient(135deg, rgba(66, 217, 255, 0.2), rgba(255, 255, 255, 0.66)),
    rgba(230, 250, 255, 0.78);
  box-shadow: 0 0 0 2px rgba(66, 217, 255, 0.18), inset 0 0 20px rgba(66, 217, 255, 0.2), 0 10px 22px rgba(31, 92, 120, 0.08);
}

.calendar-day.filled,
.picker-cell.marked,
.time-block.marked {
  border-color: rgba(255, 154, 177, 0.58);
  background:
    linear-gradient(135deg, rgba(255, 154, 177, 0.26), rgba(255, 255, 255, 0.7)),
    rgba(255, 245, 248, 0.66);
  box-shadow: inset 0 0 18px rgba(255, 154, 177, 0.16), 0 8px 18px rgba(138, 77, 91, 0.08);
}

.diary-entry {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background:
    linear-gradient(90deg, rgba(66, 217, 255, 0.11) 1px, transparent 1px),
    linear-gradient(rgba(66, 217, 255, 0.1) 1px, transparent 1px),
    color-mix(in srgb, var(--sticky-bg), white 34%);
  background-size: 28px 28px;
}

.diary-entry-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.diary-entry-head div {
  display: grid;
  gap: 3px;
}

.diary-entry-head span {
  font-size: 0.76em;
  font-weight: 900;
  color: rgba(32, 49, 65, 0.58);
}

.diary-entry-head strong {
  color: var(--tech-ink);
}

.diary-textarea {
  min-height: 0;
  flex: 1;
  background: rgba(255, 255, 255, 0.42);
}

.worksheet-table {
  display: flex;
  flex-direction: column;
  gap: 9px;
  overflow: auto;
  padding-right: 6px;
}

.worksheet-head,
.worksheet-row {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) 160px 64px;
  align-items: center;
  gap: 10px;
}

.worksheet-head {
  font-weight: 800;
  color: color-mix(in srgb, var(--note-text-color), transparent 28%);
}

.worksheet-row {
  min-height: 44px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.36);
}

.worksheet-row input[type="checkbox"] {
  width: 20px;
  height: 20px;
  justify-self: center;
}

.worksheet-row input[type="text"],
.worksheet-row input[type="date"] {
  height: 34px;
  padding: 6px 9px;
}

.worksheet-day,
.worksheet-editor {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.worksheet-day-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.worksheet-day-toolbar > div:first-child {
  display: grid;
  gap: 3px;
}

.worksheet-day-toolbar span {
  color: color-mix(in srgb, var(--note-text-color), transparent 38%);
  font-size: 0.82em;
  font-weight: 900;
}

.worksheet-day-toolbar strong {
  font-size: 1.05em;
}

.worksheet-day-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.worksheet-list {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
  overflow: auto;
  padding-right: 6px;
}

.worksheet-list .worksheet-head,
.worksheet-item {
  display: grid;
  grid-template-columns: 86px 150px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 10px;
}

.worksheet-list .worksheet-head {
  min-height: 34px;
  font-weight: 900;
  color: color-mix(in srgb, var(--note-text-color), transparent 34%);
}

.worksheet-item {
  min-height: 52px;
  padding: 7px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.36);
  border: 1px solid rgba(105, 78, 40, 0.1);
}

.worksheet-status-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}

.status-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(105, 78, 40, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  padding: 0;
}

.done-btn {
  color: #238247;
}

.fail-btn {
  color: #ad3434;
}

.worksheet-time,
.worksheet-task-text {
  min-width: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 800;
  text-align: left;
  padding: 0;
}

.worksheet-task-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.worksheet-item.completed .worksheet-time,
.worksheet-item.completed .worksheet-task-text,
.worksheet-item.failed .worksheet-time,
.worksheet-item.failed .worksheet-task-text {
  color: color-mix(in srgb, var(--note-text-color), transparent 52%);
}

.worksheet-item.completed .worksheet-task-text,
.worksheet-item.completed .worksheet-time {
  text-decoration: line-through;
  text-decoration-color: #23a45b;
  text-decoration-thickness: 2px;
}

.worksheet-item.failed .worksheet-task-text,
.worksheet-item.failed .worksheet-time {
  text-decoration: line-through;
  text-decoration-color: #d44949;
  text-decoration-thickness: 2px;
}

.worksheet-edit-card {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  background: rgba(255, 242, 157, 0.72);
  box-shadow: 0 12px 30px rgba(117, 89, 30, 0.14);
}

.worksheet-time-editor {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.worksheet-time-editor label {
  display: grid;
  gap: 8px;
  font-weight: 900;
}

.worksheet-time-editor input {
  height: 40px;
  border: 1px solid rgba(105, 78, 40, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
  color: inherit;
  font: inherit;
  padding: 0 10px;
}

.worksheet-edit-card textarea:disabled,
.worksheet-time-editor input:disabled {
  color: color-mix(in srgb, var(--note-text-color), transparent 52%);
  cursor: not-allowed;
}

.settings-view {
  overflow: auto;
  padding-right: 6px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.settings-grid label,
.custom-tags-panel {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.34);
  border: 1px solid rgba(105, 78, 40, 0.14);
  font-weight: 800;
}

.settings-grid input[type="color"] {
  width: 100%;
  height: 44px;
  border: 0;
  background: transparent;
}

.settings-grid input[type="range"] {
  width: 100%;
}

.custom-tags-panel {
  margin-top: 2px;
}

.custom-tags-header,
.custom-tag-item,
.custom-tag-form,
.icon-text-btn {
  display: flex;
  align-items: center;
}

.custom-tags-header {
  justify-content: space-between;
}

.custom-tags-header h2 {
  margin: 0;
  font-size: 1em;
}

.custom-tag-form {
  gap: 10px;
}

.custom-tag-form input[type="text"] {
  height: 38px;
  padding: 6px 10px;
}

.custom-tag-form input[type="color"] {
  width: 44px;
  height: 38px;
  border: 0;
  background: transparent;
}

.icon-text-btn {
  gap: 6px;
  white-space: nowrap;
}

.icon-text-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.custom-tag-message {
  margin: -2px 0 0;
  color: #9b4d4d;
  font-size: 0.82em;
  font-weight: 800;
}

.custom-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.custom-tag-item {
  position: relative;
  gap: 8px;
  min-height: 34px;
  padding: 4px 5px 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(105, 78, 40, 0.12);
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.custom-tag-item.default {
  padding-right: 8px;
}

.custom-tag-item.disabled {
  border-color: rgba(255, 154, 177, 0.58);
  background:
    linear-gradient(135deg, rgba(255, 154, 177, 0.24), rgba(255, 255, 255, 0.7)),
    rgba(255, 245, 248, 0.66);
  color: color-mix(in srgb, var(--note-text-color), transparent 55%);
  box-shadow: inset 0 0 16px rgba(255, 154, 177, 0.14);
}

.custom-tag-item.disabled::after {
  content: "";
  position: absolute;
  left: 12px;
  right: 42px;
  top: 50%;
  height: 2px;
  border-radius: 999px;
  background: rgba(212, 73, 73, 0.78);
}

.default-toggle-action {
  color: #9f3333;
  opacity: 0.9;
}

.custom-tag-item.disabled .default-toggle-action {
  color: #238247;
}

@media (max-width: 900px) {
  .notes-page {
    overflow-x: auto;
    justify-content: flex-start;
  }

  .notebook-stage {
    width: 980px;
  }
}
</style>
