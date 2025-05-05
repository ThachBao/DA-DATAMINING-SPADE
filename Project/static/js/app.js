document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('file');
    const fileInfo = document.getElementById('file-info');
    const fileSize = document.getElementById('file-size');
    const fileNameDisplay = document.getElementById('file-name-display');
    const selectedFileName = document.getElementById('selected-file-name');
    const clearFileBtn = document.getElementById('clear-file-btn');
    const fileDropArea = document.getElementById('file-drop-area');
    const spadeForm = document.getElementById('spade-form');
    const loadingOverlay = document.getElementById('loading-overlay');
    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percent');
    const exportCsvBtn = document.getElementById('export-csv');
    const exportJsonBtn = document.getElementById('export-json');
    const patternSearch = document.getElementById('pattern-search');
    const patternsBody = document.getElementById('patterns-body');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const firstPageBtn = document.getElementById('first-page');
    const lastPageBtn = document.getElementById('last-page');
    const showingFrom = document.getElementById('showing-from');
    const showingTo = document.getElementById('showing-to');
    const totalItems = document.getElementById('total-items');
    const pageNumbers = document.getElementById('page-numbers');
    const sortableHeaders = document.querySelectorAll('.sortable');
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelpModal = document.getElementById('close-help-modal');
    const closeHelpBtn = document.getElementById('close-help-btn');
    const togglePreview = document.getElementById('toggle-preview');
    const previewContent = document.getElementById('preview-content');
    const alertCloses = document.querySelectorAll('.alert-close');

    function updateFileDisplay() {
        if (fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            selectedFileName.textContent = file.name;
            fileSize.textContent = `(${(file.size / 1024).toFixed(2)} KB)`;
            fileInfo.style.display = 'none';
            fileNameDisplay.style.display = 'flex';
        }
    }

    fileInput.addEventListener('change', updateFileDisplay);

    clearFileBtn.addEventListener('click', function () {
        fileInput.value = '';
        fileInfo.style.display = 'block';
        fileNameDisplay.style.display = 'none';
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileDropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        fileDropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileDropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        fileDropArea.classList.add('highlight');
    }

    function unhighlight() {
        fileDropArea.classList.remove('highlight');
    }

    fileDropArea.addEventListener('drop', function (e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            fileInput.files = files;
            updateFileDisplay();
        }
    });

    if (spadeForm) {
        spadeForm.addEventListener('submit', function (e) {
            const file = fileInput.files[0];
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file && file.size > maxSize) {
                e.preventDefault();
                alert('File vượt quá kích thước tối đa (10MB).');
                return;
            }
            if (file && !['text/plain', 'text/csv', 'application/octet-stream'].includes(file.type)) {
                e.preventDefault();
                alert('Chỉ hỗ trợ file .txt, .csv, .dat');
                return;
            }
            loadingOverlay.classList.add('active');
            simulateProgress();
        });
    }

    function simulateProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            progressBar.style.width = `${progress}%`;
            progressPercent.textContent = `${Math.round(progress)}%`;
        }, 300);
    }

    function formatPattern(items) {
        return items.join(' -> ');
    }

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', function () {
            const patterns = [];
            const supports = [];
            document.querySelectorAll('#patterns-body tr:not([style*="display: none"]) .pattern-sequence').forEach(el => {
                const items = Array.from(el.querySelectorAll('.sequence-item')).map(item => item.textContent);
                patterns.push(formatPattern(items));
            });
            document.querySelectorAll('#patterns-body tr:not([style*="display: none"]) .support-value span').forEach(el => supports.push(el.textContent));

            const data = { patterns, supports };
            fetch('/export/csv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
                .then(response => {
                    if (!response.ok) throw new Error('Lỗi khi xuất CSV');
                    return response.blob();
                })
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'patterns.csv';
                    a.click();
                    window.URL.revokeObjectURL(url);
                })
                .catch(error => alert('Lỗi khi xuất CSV: ' + error.message));
        });
    }

    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', function () {
            const patterns = [];
            const supports = [];
            document.querySelectorAll('#patterns-body tr:not([style*="display: none"]) .pattern-sequence').forEach(el => {
                const items = Array.from(el.querySelectorAll('.sequence-item')).map(item => item.textContent);
                patterns.push(formatPattern(items));
            });
            document.querySelectorAll('#patterns-body tr:not([style*="display: none"]) .support-value span').forEach(el => supports.push(el.textContent));

            const data = { patterns, supports };
            fetch('/export/json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
                .then(response => {
                    if (!response.ok) throw new Error('Lỗi khi xuất JSON');
                    return response.blob();
                })
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'patterns.json';
                    a.click();
                    window.URL.revokeObjectURL(url);
                })
                .catch(error => alert('Lỗi khi xuất JSON: ' + error.message));
        });
    }

    let searchTimeout;
    patternSearch?.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            updatePagination();
        }, 300);
    });

    const rowsPerPage = 10;
    let currentPage = 1;
    let totalPages = 1;
    let allRows = [];

    if (patternsBody) {
        allRows = Array.from(patternsBody.querySelectorAll('tr'));
        updatePagination();
    }

    firstPageBtn?.addEventListener('click', function () {
        currentPage = 1;
        updatePagination();
    });

    prevPageBtn?.addEventListener('click', function () {
        if (currentPage > 1) {
            currentPage--;
            updatePagination();
        }
    });

    nextPageBtn?.addEventListener('click', function () {
        if (currentPage < totalPages) {
            currentPage++;
            updatePagination();
        }
    });

    lastPageBtn?.addEventListener('click', function () {
        currentPage = totalPages;
        updatePagination();
    });

    function updatePagination() {
        const searchTerm = patternSearch ? patternSearch.value.toLowerCase() : '';
        const filteredRows = searchTerm
            ? allRows.filter(row => {
                const pattern = Array.from(row.querySelectorAll('.pattern-sequence .sequence-item'))
                    .map(item => item.textContent.toLowerCase())
                    .join(' ');
                return pattern.includes(searchTerm);
            })
            : allRows;

        totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        allRows.forEach(row => row.style.display = 'none');

        const start = (currentPage - 1) * rowsPerPage;
        const end = Math.min(start + rowsPerPage, filteredRows.length);
        const visibleRows = filteredRows.slice(start, end);

        visibleRows.forEach(row => row.style.display = '');

        showingFrom.textContent = filteredRows.length ? start + 1 : 0;
        showingTo.textContent = end;
        totalItems.textContent = filteredRows.length;

        pageNumbers.innerHTML = '';
        const maxVisiblePages = 5;
        const half = Math.floor(maxVisiblePages / 2);
        let startPage = Math.max(1, currentPage - half);
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const span = document.createElement('span');
            span.textContent = i;
            if (i === currentPage) span.style.fontWeight = 'bold';
            span.addEventListener('click', () => {
                currentPage = i;
                updatePagination();
            });
            pageNumbers.appendChild(span);
        }

        firstPageBtn.disabled = currentPage === 1;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
        lastPageBtn.disabled = currentPage === totalPages;
    }

    sortableHeaders.forEach(header => {
        header.addEventListener('click', function () {
            const sortBy = this.dataset.sort;
            const isAscending = !this.classList.contains('asc');

            sortableHeaders.forEach(h => {
                h.classList.remove('asc', 'desc');
                const icon = h.querySelector('i');
                icon.className = 'fas fa-sort';
            });

            this.classList.add(isAscending ? 'asc' : 'desc');
            const icon = this.querySelector('i');
            icon.className = isAscending ? 'fas fa-sort-up' : 'fas fa-sort-down';

            sortRows(sortBy, isAscending);
            updatePagination();
        });
    });

    // Cập nhật hàm sortRows
    function sortRows(sortBy, isAscending) {
        const rows = Array.from(allRows);
        rows.sort((a, b) => {
            let valueA, valueB;
            if (sortBy === 'support') {
                valueA = parseInt(a.querySelector('.support-value span').textContent);
                valueB = parseInt(b.querySelector('.support-value span').textContent);
                return isAscending ? valueA - valueB : valueB - valueA;
            } else if (sortBy === 'length') {
                // Tính độ dài thực tế (coi itemset là 1 phần tử)
                valueA = Array.from(a.querySelectorAll('.pattern-sequence > .sequence-items > *'))
                    .filter(el => !el.classList.contains('sequence-arrow')).length;
                valueB = Array.from(b.querySelectorAll('.pattern-sequence > .sequence-items > *'))
                    .filter(el => !el.classList.contains('sequence-arrow')).length;
                return isAscending ? valueA - valueB : valueB - valueA;
            } else {
                valueA = Array.from(a.querySelectorAll('.pattern-sequence > .sequence-items > *'))
                    .filter(el => !el.classList.contains('sequence-arrow'))
                    .map(el => el.textContent)
                    .join(' ');
                valueB = Array.from(b.querySelectorAll('.pattern-sequence > .sequence-items > *'))
                    .filter(el => !el.classList.contains('sequence-arrow'))
                    .map(el => el.textContent)
                    .join(' ');
                return isAscending ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
            }
        });
        rows.forEach(row => patternsBody.appendChild(row));
        allRows = rows;
    }

    helpBtn?.addEventListener('click', () => {
        helpModal.classList.add('active');
    });

    closeHelpModal?.addEventListener('click', () => {
        helpModal.classList.remove('active');
    });

    closeHelpBtn?.addEventListener('click', () => {
        helpModal.classList.remove('active');
    });

    togglePreview?.addEventListener('click', () => {
        previewContent.classList.toggle('active');
        const icon = togglePreview.querySelector('i');
        icon.className = previewContent.classList.contains('active') ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    });

    alertCloses.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.parentElement.remove();
        });
    });
});