import './style.css';
import { api } from './http.js';

const state = {
  posts: [],
  loading: false,
  error: null,
  userId: '', // '' = all
};

const $list = document.getElementById('list');
const $status = document.getElementById('status');
const $filter = document.getElementById('userFilter');
const $form = document.getElementById('createForm');
const $createBtn = document.getElementById('createBtn');

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

// ---------- Render ----------
function render() {
  // status area: loading / error / empty
  if (state.loading) {
    $status.innerHTML = `<p class="text-slate-500 py-4">Loading...</p>`;
  } else if (state.error) {
    $status.innerHTML = `
      <div class="bg-red-100 text-red-700 rounded p-3 mb-3 flex justify-between items-center">
        <span>${esc(state.error)}</span>
        <button data-action="dismiss" class="underline">Dismiss</button>
      </div>`;
  } else if (state.posts.length === 0) {
    $status.innerHTML = `<p class="text-slate-500 py-4">No posts found.</p>`;
  } else {
    $status.innerHTML = '';
  }

  $list.innerHTML = state.loading
    ? ''
    : state.posts
        .map(
          (p) => `
      <article class="bg-white rounded-lg shadow p-4" data-id="${p.id}">
        <div class="text-xs text-slate-400 mb-1">Post #${p.id} · User ${p.userId}</div>
        <h3 class="font-semibold text-lg mb-1">${esc(p.title)}</h3>
        <p class="text-slate-600 mb-3">${esc(p.body)}</p>
        <div class="flex gap-2">
          <button data-action="edit"
            class="px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-sm">Edit</button>
          <button data-action="delete"
            class="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm">Delete</button>
        </div>
      </article>`
        )
        .join('');
}

// ---------- Load / filter ----------
async function loadPosts() {
  state.loading = true;
  state.error = null;
  render();
  try {
    const params = state.userId
      ? { userId: state.userId }
      : { _limit: 10 };
    state.posts = await api.list(params);
  } catch (err) {
    state.error = err.message;
    state.posts = [];
  } finally {
    state.loading = false;
    render();
  }
}

$filter.innerHTML =
  `<option value="">All (first 10)</option>` +
  Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}">User ${i + 1}</option>`).join('');

$filter.addEventListener('change', () => {
  state.userId = $filter.value;
  loadPosts();
});

// ---------- Create ----------
$form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('newTitle').value.trim();
  const body = document.getElementById('newBody').value.trim();
  if (!title || !body) return;

  $createBtn.disabled = true;
  $createBtn.textContent = 'Creating...';
  try {
    const created = await api.create({ title, body, userId: Number(state.userId) || 1 });
    state.posts = [created, ...state.posts]; // add to top
    state.error = null;
    $form.reset();
  } catch (err) {
    state.error = err.message;
  } finally {
    $createBtn.disabled = false;
    $createBtn.textContent = 'Create';
    render();
  }
});

// ---------- Edit + Delete (event delegation) ----------
$list.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const card = btn.closest('article');
  const id = Number(card.dataset.id);
  const post = state.posts.find((p) => p.id === id);

  if (btn.dataset.action === 'edit') {
    const newTitle = prompt('New title:', post.title);
    if (newTitle === null || !newTitle.trim() || newTitle.trim() === post.title) return;

    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
      const updated = await api.update(id, { title: newTitle.trim() });
      // update only the title in local state
      state.posts = state.posts.map((p) =>
        p.id === id ? { ...p, title: updated.title } : p
      );
      state.error = null;
    } catch (err) {
      state.error = err.message;
    }
    render();
  }

  if (btn.dataset.action === 'delete') {
    if (!confirm(`Delete post #${id}?`)) return;

    btn.disabled = true;
    btn.textContent = 'Deleting...';
    try {
      await api.remove(id); // throws if server doesn't say OK
      state.posts = state.posts.filter((p) => p.id !== id); // remove AFTER success
      state.error = null;
    } catch (err) {
      state.error = err.message;
    }
    render();
  }
});

$status.addEventListener('click', (e) => {
  if (e.target.dataset.action === 'dismiss') {
    state.error = null;
    render();
  }
});

loadPosts();