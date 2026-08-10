/**
 * public/js/newsMediaManager.js — News "მედია" section
 * =======================================================
 * Drives the media manager on views/admin/news-create.ejs and
 * views/admin/news-edit.ejs (shared partial:
 * views/admin/partials/news-media-manager.ejs).
 *
 * Architecture note: uploads still happen as part of the ONE regular
 * form submit (multipart/form-data), exactly like the site's other
 * admin forms — there is no separate async upload endpoint. This file
 * only manages the *client-side selection* so the admin gets instant
 * previews, reordering, cover choice, and delete-marking before ever
 * hitting "save"; everything is written into hidden fields and
 * committed together on submit. See newsAdminController.js for how
 * those hidden fields are read.
 *
 * UI model: photos and videos live in ONE grid (#newsMediaGrid) so the
 * admin never sees "two systems" — videos are just visually distinct
 * tiles within it. Photo tiles always stay contiguous at the front of
 * the grid; video tiles always stay at the end. Two labels share the
 * single hidden <input type="file">: a large empty-state dropzone
 * (visible only with zero media) and a compact "add more" pill (visible
 * once media exists) — never the browser's native file control.
 *
 * Reordering uses simple ◀ ▶ buttons rather than drag-and-drop —
 * reliable on touch, mouse, and keyboard alike without a library.
 * Videos aren't reorderable (no move buttons), matching the backend,
 * which only tracks sort order for images.
 *
 * No dependencies. No new files added to node_modules.
 */
(function () {
  'use strict';

  const root = document.getElementById('newsMediaManager');
  if (!root) return; // this script is only loaded on the create/edit pages

  const input          = document.getElementById('newsMediaInput');
  const emptyState      = document.getElementById('newsMediaEmpty');
  const addMoreBtn        = document.getElementById('newsMediaAddMore');
  const errorEl             = document.getElementById('newsMediaError');
  const grid                  = document.getElementById('newsMediaGrid');
  const summaryText             = document.getElementById('newsMediaSummaryText');
  const deleteIdsField           = document.getElementById('newsMediaDeleteIds');
  const orderField                 = document.getElementById('newsMediaOrder');
  const coverIdField                 = document.getElementById('newsMediaCoverId');
  const coverIndexField                = document.getElementById('newsMediaCoverIndex');
  const form                             = root.closest('form');

  const ALLOWED_IMAGE = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const ALLOWED_VIDEO = ['video/mp4', 'video/webm'];
  const MAX_IMAGE_SIZE = 5  * 1024 * 1024;
  const MAX_VIDEO_SIZE = 40 * 1024 * 1024;
  const MAX_FILES      = 12;
  const EMPTY_SUMMARY_TEXT = summaryText.dataset.emptyText;

  // ── State ────────────────────────────────────────────
  // Newly selected (not yet uploaded) files. Each entry keeps a stable
  // `token` so cover selection survives reordering/removal elsewhere.
  let pendingFiles = []; // { token, file, type: 'image'|'video', url }
  let tokenSeed    = 0;

  // Existing (already-saved) media the admin can delete/reorder/re-cover.
  const deletedExistingIds = new Set();

  // Which single item is currently the cover.
  // { kind:'existing', id:number } | { kind:'new', token:number } | null
  let coverRef = null;
  const initialCoverId = parseInt(coverIdField.value, 10);
  if (!Number.isNaN(initialCoverId)) coverRef = { kind: 'existing', id: initialCoverId };

  // ── Helpers ──────────────────────────────────────────

  const isImageTile = (el) => el.matches('.admin-media-tile') && !el.matches('.admin-media-tile-video');

  const totalFileCount = () =>
    root.querySelectorAll('[data-existing-id]:not(.is-marked-for-delete)').length + pendingFiles.length;

  const showError = (msg) => {
    errorEl.textContent = msg;
    errorEl.classList.add('is-visible');
  };
  const clearError = () => {
    errorEl.textContent = '';
    errorEl.classList.remove('is-visible');
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  /** Rebuild the real <input>'s FileList from `pendingFiles`, in order. */
  const syncInputFiles = () => {
    const dt = new DataTransfer();
    pendingFiles.forEach((p) => dt.items.add(p.file));
    input.files = dt.files;
  };

  /** Photo tiles always precede video tiles in the grid — a new photo is
   *  inserted right before the first video tile (if any); a new video is
   *  always appended at the very end. */
  const insertTileNode = (node, type) => {
    if (type === 'video') {
      grid.appendChild(node);
    } else {
      const firstVideo = grid.querySelector('.admin-media-tile-video');
      if (firstVideo) grid.insertBefore(node, firstVideo);
      else grid.appendChild(node);
    }
  };

  const refreshCounts = () => {
    // Only count server-rendered (data-existing-id) tiles here — pending
    // (newly-selected, data-token) tiles are already in pendingFiles and
    // counted separately below, even though both live in the same DOM grid.
    const existingImages = Array.from(grid.querySelectorAll('.admin-media-tile[data-existing-id]:not(.is-marked-for-delete)')).filter(isImageTile).length;
    const existingVideos = grid.querySelectorAll('.admin-media-tile-video[data-existing-id]:not(.is-marked-for-delete)').length;
    const newImages = pendingFiles.filter((p) => p.type === 'image').length;
    const newVideos = pendingFiles.filter((p) => p.type === 'video').length;
    const imgTotal = existingImages + newImages;
    const vidTotal = existingVideos + newVideos;

    const parts = [];
    if (imgTotal > 0) parts.push(`${imgTotal} ფოტო`);
    if (vidTotal > 0) parts.push(`${vidTotal} ვიდეო`);
    summaryText.textContent = parts.length ? parts.join(' • ') : EMPTY_SUMMARY_TEXT;
    summaryText.parentElement.classList.toggle('is-empty', parts.length === 0);

    const hasMedia = (imgTotal + vidTotal) > 0;
    emptyState.hidden = hasMedia;
    grid.hidden = !hasMedia;
    addMoreBtn.hidden = !hasMedia;
  };

  /** Re-apply the "is-cover" visual state to whichever tile matches `coverRef`. */
  const refreshCoverVisuals = () => {
    root.querySelectorAll('.admin-media-cover-btn').forEach((btn) => {
      const isThisOne =
        (coverRef?.kind === 'existing' && btn.closest('[data-existing-id]')?.dataset.existingId === String(coverRef.id)) ||
        (coverRef?.kind === 'new' && btn.closest('[data-token]')?.dataset.token === String(coverRef.token));
      btn.classList.toggle('is-cover', !!isThisOne);
      btn.querySelector('.admin-media-cover-label').textContent = isThisOne ? 'მთავარი' : '';
      btn.setAttribute('aria-pressed', isThisOne ? 'true' : 'false');
    });
  };

  /** Enable/disable the ◀/▶ ends of the reorderable photo run (videos
   *  aren't reorderable, so they're excluded from this list entirely). */
  const refreshMoveButtonStates = () => {
    const tiles = Array.from(grid.children).filter(
      (t) => isImageTile(t) && !t.classList.contains('is-marked-for-delete')
    );
    tiles.forEach((tile, i) => {
      const left  = tile.querySelector('[data-dir="-1"]');
      const right = tile.querySelector('[data-dir="1"]');
      if (left)  left.disabled  = i === 0;
      if (right) right.disabled = i === tiles.length - 1;
    });
  };

  const refreshAll = () => {
    refreshCounts();
    refreshCoverVisuals();
    refreshMoveButtonStates();
  };

  // ── Existing-tile wiring (server-rendered) ──────────────────────

  const wireExistingImageTile = (tile) => {
    const id = tile.dataset.existingId;

    tile.querySelector('.admin-media-remove-btn')?.addEventListener('click', () => {
      tile.classList.add('is-marked-for-delete');
      deletedExistingIds.add(id);
      if (coverRef?.kind === 'existing' && String(coverRef.id) === id) coverRef = null;
      commitDeleteIds();
      refreshAll();
    });

    tile.querySelector('.admin-media-cover-btn')?.addEventListener('click', () => {
      coverRef = { kind: 'existing', id: parseInt(id, 10) };
      refreshCoverVisuals();
    });

    tile.querySelectorAll('.admin-media-move-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        moveExistingTile(tile, parseInt(btn.dataset.dir, 10));
      });
    });
  };

  const wireExistingVideoTile = (tile) => {
    const id = tile.dataset.existingId;
    tile.querySelector('.admin-media-remove-btn')?.addEventListener('click', () => {
      tile.classList.add('is-marked-for-delete');
      deletedExistingIds.add(id);
      commitDeleteIds();
      refreshCounts();
    });
  };

  const moveExistingTile = (tile, dir) => {
    const sibling = dir < 0 ? tile.previousElementSibling : tile.nextElementSibling;
    if (!sibling || !isImageTile(sibling)) return; // never cross into video territory
    if (dir < 0) grid.insertBefore(tile, sibling);
    else grid.insertBefore(sibling, tile);
    commitOrder();
    refreshMoveButtonStates();
  };

  const commitDeleteIds = () => {
    deleteIdsField.value = Array.from(deletedExistingIds).join(',');
  };

  const commitOrder = () => {
    const ids = Array.from(grid.children)
      .filter((t) => isImageTile(t) && t.dataset.existingId && !t.classList.contains('is-marked-for-delete'))
      .map((t) => t.dataset.existingId);
    orderField.value = ids.join(',');
  };

  root.querySelectorAll('.admin-media-tile[data-existing-id]').forEach((tile) => {
    if (isImageTile(tile)) wireExistingImageTile(tile);
    else wireExistingVideoTile(tile);
  });
  commitOrder();

  // ── New-file selection ──────────────────────────────────────────

  const isDuplicate = (file) =>
    pendingFiles.some((p) => p.file.name === file.name && p.file.size === file.size);

  const addFiles = (fileList) => {
    clearError();
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    let firstError = null;
    incoming.forEach((file) => {
      if (totalFileCount() >= MAX_FILES) {
        firstError = firstError || `ერთდროულად მაქსიმუმ ${MAX_FILES} ფაილის ატვირთვაა შესაძლებელი.`;
        return;
      }
      const isImage = ALLOWED_IMAGE.includes(file.type);
      const isVideo = ALLOWED_VIDEO.includes(file.type);
      if (!isImage && !isVideo) {
        firstError = firstError || 'ფაილის ფორმატი არ არის მხარდაჭერილი.';
        return;
      }
      if (isImage && file.size > MAX_IMAGE_SIZE) {
        firstError = firstError || 'ფაილის ზომა ძალიან დიდია (მაქს. 5 MB სურათისთვის).';
        return;
      }
      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        firstError = firstError || 'ფაილის ზომა ძალიან დიდია (მაქს. 40 MB ვიდეოსთვის).';
        return;
      }
      if (isDuplicate(file)) {
        firstError = firstError || 'ეს ფაილი უკვე დამატებულია.';
        return;
      }

      const entry = {
        token: ++tokenSeed,
        file,
        type: isVideo ? 'video' : 'image',
        url: URL.createObjectURL(file),
      };
      pendingFiles.push(entry);
      renderPendingEntry(entry);

      // First image added overall (no cover yet) becomes the default cover.
      if (entry.type === 'image' && coverRef === null) {
        coverRef = { kind: 'new', token: entry.token };
      }
    });

    if (firstError) showError(firstError);
    syncInputFiles();
    refreshAll();
  };

  const renderPendingEntry = (entry) => {
    let tile;
    if (entry.type === 'video') {
      tile = document.createElement('div');
      tile.className = 'admin-media-tile admin-media-tile-video';
      tile.dataset.token = String(entry.token);
      tile.innerHTML =
        '<div class="admin-media-video-visual">' +
        '  <span class="admin-media-video-play"><i data-lucide="play"></i></span>' +
        '  <span class="admin-media-video-label">ვიდეო</span>' +
        '</div>' +
        '<span class="admin-media-video-filename"></span>' +
        '<button type="button" class="admin-media-remove-btn" aria-label="ვიდეოს წაშლა" title="ვიდეოს წაშლა"><i data-lucide="x"></i></button>';
      tile.querySelector('.admin-media-video-filename').textContent =
        `${entry.file.name} · ${formatSize(entry.file.size)}`;
      tile.querySelector('.admin-media-remove-btn').addEventListener('click', () => removePending(entry.token));
    } else {
      tile = document.createElement('div');
      tile.className = 'admin-media-tile';
      tile.dataset.token = String(entry.token);
      tile.innerHTML =
        '<img class="admin-media-tile-img" alt="" />' +
        '<button type="button" class="admin-media-cover-btn" aria-label="მთავარ ფოტოდ დაყენება" title="მთავარ ფოტოდ დაყენება" aria-pressed="false">' +
        '  <i data-lucide="star"></i><span class="admin-media-cover-label"></span>' +
        '</button>' +
        '<button type="button" class="admin-media-remove-btn" aria-label="სურათის წაშლა" title="სურათის წაშლა"><i data-lucide="x"></i></button>' +
        '<div class="admin-media-tile-controls">' +
        '  <button type="button" class="admin-media-move-btn" data-dir="-1" aria-label="მარცხნივ გადატანა" title="მარცხნივ გადატანა"><i data-lucide="chevron-left"></i></button>' +
        '  <button type="button" class="admin-media-move-btn" data-dir="1" aria-label="მარჯვნივ გადატანა" title="მარჯვნივ გადატანა"><i data-lucide="chevron-right"></i></button>' +
        '</div>';
      tile.querySelector('.admin-media-tile-img').src = entry.url;
      tile.querySelector('.admin-media-cover-btn').addEventListener('click', () => {
        coverRef = { kind: 'new', token: entry.token };
        refreshCoverVisuals();
      });
      tile.querySelector('.admin-media-remove-btn').addEventListener('click', () => removePending(entry.token));
      tile.querySelectorAll('.admin-media-move-btn').forEach((btn) => {
        btn.addEventListener('click', () => movePendingTile(entry.token, parseInt(btn.dataset.dir, 10)));
      });
    }
    insertTileNode(tile, entry.type);
    if (window.lucide) window.lucide.createIcons();
  };

  const removePending = (token) => {
    const idx = pendingFiles.findIndex((p) => p.token === token);
    if (idx === -1) return;
    URL.revokeObjectURL(pendingFiles[idx].url);
    pendingFiles.splice(idx, 1);

    const el = root.querySelector(`[data-token="${token}"]`);
    el?.remove();

    if (coverRef?.kind === 'new' && coverRef.token === token) {
      const nextImage = pendingFiles.find((p) => p.type === 'image');
      coverRef = nextImage ? { kind: 'new', token: nextImage.token } : findFallbackExistingCover();
    }

    syncInputFiles();
    refreshAll();
  };

  const movePendingTile = (token, dir) => {
    const tile = grid.querySelector(`.admin-media-tile[data-token="${token}"]`);
    if (!tile) return;
    const sibling = dir < 0 ? tile.previousElementSibling : tile.nextElementSibling;
    // Never move a "new" photo before an "existing" one, and never cross
    // into video territory — new uploads always come after existing
    // photos and before any video (see insertTileNode / server ordering).
    if (!sibling || !isImageTile(sibling)) return;
    if (dir < 0 && sibling.dataset.existingId) return;

    const fromIdx = pendingFiles.findIndex((p) => p.token === token);
    const toIdx   = fromIdx + dir;
    if (toIdx < 0 || toIdx >= pendingFiles.length) return;
    [pendingFiles[fromIdx], pendingFiles[toIdx]] = [pendingFiles[toIdx], pendingFiles[fromIdx]];

    if (dir < 0) grid.insertBefore(tile, sibling);
    else grid.insertBefore(sibling, tile);

    syncInputFiles();
    refreshMoveButtonStates();
  };

  const findFallbackExistingCover = () => {
    const firstRemaining = Array.from(grid.children).find(
      (t) => isImageTile(t) && t.dataset.existingId && !t.classList.contains('is-marked-for-delete')
    );
    return firstRemaining ? { kind: 'existing', id: parseInt(firstRemaining.dataset.existingId, 10) } : null;
  };

  // ── Upload triggers: click-to-browse (native) + optional drag & drop ──

  input.addEventListener('change', () => {
    // The input's own FileList is about to be replaced by syncInputFiles()
    // inside addFiles(), so read it first.
    addFiles(input.files);
  });

  // Drag & drop works anywhere over the media card — not just the empty
  // dropzone — so it keeps working after the first file is added, even
  // though the visible entry point changes from the big box to the pill.
  ['dragenter', 'dragover'].forEach((evt) => {
    root.addEventListener(evt, (e) => {
      e.preventDefault();
      root.classList.add('is-dragover');
    });
  });
  ['dragleave', 'dragend', 'drop'].forEach((evt) => {
    root.addEventListener(evt, () => root.classList.remove('is-dragover'));
  });
  root.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });

  // ── Commit final state into hidden fields right before submit ────

  form?.addEventListener('submit', () => {
    commitDeleteIds();
    commitOrder();

    if (coverRef?.kind === 'existing') {
      coverIdField.value    = String(coverRef.id);
      coverIndexField.value = '';
    } else if (coverRef?.kind === 'new') {
      const idx = pendingFiles.findIndex((p) => p.token === coverRef.token);
      coverIdField.value    = idx === -1 ? '' : `new:${idx}`;
      coverIndexField.value = idx === -1 ? '' : String(idx); // used by the create-form controller
    } else {
      coverIdField.value    = '';
      coverIndexField.value = '';
    }
  });

  refreshAll();
})();
