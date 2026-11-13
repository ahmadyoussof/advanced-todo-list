document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'advanced_todo_tasks_v1';
  const THEME_KEY = 'advanced_todo_theme';

  const taskInput = document.getElementById('taskInput');
  const categorySelect = document.getElementById('categorySelect');
  const prioritySelect = document.getElementById('prioritySelect');
  const dueDateInput = document.getElementById('dueDateInput');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const taskList = document.getElementById('taskList');
  const searchInput = document.getElementById('searchInput');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const themeToggle = document.getElementById('themeToggle');
  const totalCount = document.getElementById('totalCount');
  const completedCount = document.getElementById('completedCount');
  const pendingCount = document.getElementById('pendingCount');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');

  let tasks = loadTasks();
  let currentFilter = 'all';

  function loadTasks() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading tasks:', error);
      return [];
    }
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  // دالة تشغيل الصوت بالاسم الطويل الصحيح
  function playPopSound() {
    const audio = new Audio('776443__chaferwitt__pop-out-bubble-soft-bursting.mp3');
    audio.volume = 0.6;
    audio.play().catch(error => {
      console.log("Audio play prevented by browser:", error);
    });
  }

  function generateTaskId() {
    return Date.now() + Math.random() * 1000;
  }

  function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  function sortTasks(items) {
    return [...items].sort((a, b) => {
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);

      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;

      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }

  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    themeToggle.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
  }

  function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(savedTheme);
  }

  function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
  }

  function updateStats() {
    const complete = tasks.filter(task => task.completed).length;
    const pending = tasks.length - complete;

    totalCount.textContent = tasks.length;
    completedCount.textContent = complete;
    pendingCount.textContent = pending;
  }

  function updateProgress() {
    if (!tasks.length) {
      progressBar.style.width = '0%';
      progressText.textContent = '0%';
      return;
    }

    const complete = tasks.filter(task => task.completed).length;
    const percent = Math.round((complete / tasks.length) * 100);

    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${percent}%`;
  }

  function getFilteredTasks() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    return sortTasks(
      tasks.filter(task => {
        const matchesSearch =
          !searchTerm ||
          task.text.toLowerCase().includes(searchTerm) ||
          task.category.toLowerCase().includes(searchTerm);

        const today = getLocalDateString();

        let matchesFilter = true;

        if (currentFilter === 'active') matchesFilter = !task.completed;
        if (currentFilter === 'completed') matchesFilter = task.completed;
        if (currentFilter === 'today') matchesFilter = task.dueDate === today;
        if (currentFilter === 'all') matchesFilter = true;

        return matchesSearch && matchesFilter;
      })
    );
  }

  function renderTasks() {
    const filteredTasks = getFilteredTasks();

    if (!filteredTasks.length) {
      taskList.innerHTML = `
        <div class="empty-state">
          No tasks found. Add a new task to get started.
        </div>
      `;
      return;
    }

    taskList.innerHTML = filteredTasks
      .map(
        task => `
          <div class="task-item ${task.completed ? 'completed' : ''}">
            <div class="task-left">
              <button class="checkbox" data-action="toggle" data-id="${task.id}">
                ${task.completed ? '✓' : ''}
              </button>

              <div class="task-info">
                <div class="task-text">${escapeHtml(task.text)}</div>
                <div class="task-meta">
                  <span class="badge badge-category">${escapeHtml(task.category)}</span>
                  <span class="badge badge-${task.priority}">${task.priority.toUpperCase()}</span>
                  ${task.dueDate ? `<span class="date-text">📅 ${escapeHtml(formatDate(task.dueDate))}</span>` : ''}
                </div>
              </div>
            </div>

            <div class="task-actions">
              <button class="action-btn edit" data-action="edit" data-id="${task.id}" title="Edit">✏️</button>
              <button class="action-btn delete" data-action="delete" data-id="${task.id}" title="Delete">🗑️</button>
            </div>
          </div>
        `
      )
      .join('');
  }

  function updateUI() {
    updateStats();
    updateProgress();
    renderTasks();
  }

  function addTask() {
    const text = taskInput.value.trim();
    if (!text) {
      taskInput.focus();
      return;
    }

    const newTask = {
      id: generateTaskId(),
      text,
      category: categorySelect.value,
      priority: prioritySelect.value,
      dueDate: dueDateInput.value,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    tasks.push(newTask);
    saveTasks();
    playPopSound(); // تشغيل الصوت عند الإضافة

    taskInput.value = '';
    categorySelect.value = 'General';
    prioritySelect.value = 'medium';
    dueDateInput.value = '';
    updateUI();
  }

  function toggleTask(id) {
    tasks = tasks.map(task =>
      task.id === Number(id) ? { ...task, completed: !task.completed } : task
    );
    saveTasks();
    playPopSound(); // تشغيل الصوت عند إتمام المهمة

    updateUI();
  }

  function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== Number(id));
    saveTasks();
    updateUI();
  }

  function editTask(id) {
    const task = tasks.find(item => item.id === Number(id));
    if (!task) return;

    const newText = prompt('Edit task:', task.text);

    if (newText === null) return;

    const cleaned = newText.trim();
    if (!cleaned) {
      alert('Task cannot be empty.');
      return;
    }

    tasks = tasks.map(item =>
      item.id === Number(id) ? { ...item, text: cleaned } : item
    );

    saveTasks();
    updateUI();
  }

  addTaskBtn.addEventListener('click', addTask);

  taskInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') addTask();
  });

  searchInput.addEventListener('input', () => {
    renderTasks();
  });

  filterBtns.forEach(button => {
    button.addEventListener('click', () => {
      filterBtns.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      currentFilter = button.dataset.filter || 'all';
      renderTasks();
    });
  });

  taskList.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;

    const { action, id } = button.dataset;

    if (action === 'toggle') toggleTask(id);
    if (action === 'delete') deleteTask(id);
    if (action === 'edit') editTask(id);
  });

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    applyTheme(nextTheme);
    saveTheme(nextTheme);
  });

  loadTheme();
  updateUI();
});
